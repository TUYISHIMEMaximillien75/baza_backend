import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import fetch from 'node-fetch';
import { Listing } from '../listings/entities/listing.entity';
import { ListingStatus } from '../../common/enums';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedSearchParams {
  categorySlug?: string;
  categoryKeywords?: string[]; // synonyms the AI knows about
  purpose?: 'SALE' | 'RENT';
  province?: string;
  district?: string;
  sector?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  freeTextSearch?: string; // general keyword search in title+desc
  aiExplanation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Synonym maps (client-side pre-processing as safety net) ──────────────────
const CATEGORY_SYNONYMS: Record<string, string> = {
  car: 'vehicles', cars: 'vehicles', vehicle: 'vehicles', vehicles: 'vehicles',
  truck: 'vehicles', bus: 'vehicles', motorbike: 'vehicles', motorcycle: 'vehicles',
  toyota: 'vehicles', honda: 'vehicles', mazda: 'vehicles', bmw: 'vehicles',
  mercedes: 'vehicles', nissan: 'vehicles', hyundai: 'vehicles', suzuki: 'vehicles',
  suv: 'vehicles', sedan: 'vehicles', pickup: 'vehicles', 'pick-up': 'vehicles',
  house: 'houses', houses: 'houses', home: 'houses', villa: 'houses',
  bungalow: 'houses', building: 'houses', maison: 'houses', inzu: 'houses',
  apartment: 'apartments', flat: 'apartments', studio: 'apartments',
  'self-contained': 'apartments', bedsitter: 'apartments',
  land: 'land-plots', plot: 'land-plots', terrain: 'land-plots',
  plots: 'land-plots', 'land plot': 'land-plots', ubutaka: 'land-plots',
  commercial: 'commercial', office: 'commercial', shop: 'commercial',
  warehouse: 'commercial', boutique: 'commercial',
};

const PURPOSE_SYNONYMS: Record<string, 'SALE' | 'RENT'> = {
  buy: 'SALE', purchase: 'SALE', sale: 'SALE', sell: 'SALE', 'for sale': 'SALE',
  gutanga: 'SALE', kugura: 'SALE',
  rent: 'RENT', lease: 'RENT', hire: 'RENT', 'for rent': 'RENT',
  gukoranya: 'RENT', gukodesha: 'RENT',
};

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  // ─── Public entry ─────────────────────────────────────────────────────────
  async search(userQuery: string) {
    const normalizedQuery = userQuery.trim();

    // Pre-process: apply local synonym map before sending to AI
    const preParams = this.localPreProcess(normalizedQuery);

    // Parse with AI (merges with pre-processed params)
    const parsed = await this.parseWithGroq(normalizedQuery, preParams);

    // Search with fallback strategy
    const { results, strategy } = await this.searchWithFallback(parsed, normalizedQuery);

    return {
      query: normalizedQuery,
      aiExplanation: parsed.aiExplanation,
      appliedStrategy: strategy,
      parsedFilters: {
        categorySlug: parsed.categorySlug,
        purpose: parsed.purpose,
        province: parsed.province,
        district: parsed.district,
        sector: parsed.sector,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
        minRooms: parsed.minRooms,
      },
      results,
      totalFound: results.length,
    };
  }

  // ─── Local pre-processor (no AI needed for obvious cases) ─────────────────
  private localPreProcess(query: string): Partial<ParsedSearchParams> {
    const q = query.toLowerCase();
    const params: Partial<ParsedSearchParams> = {};

    // Detect category from synonyms
    for (const [word, slug] of Object.entries(CATEGORY_SYNONYMS)) {
      if (q.includes(word)) {
        params.categorySlug = slug;
        break;
      }
    }

    // Detect purpose from synonyms
    for (const [word, purpose] of Object.entries(PURPOSE_SYNONYMS)) {
      if (q.includes(word)) {
        params.purpose = purpose;
        break;
      }
    }

    // Detect room count: "3 rooms", "4 bedrooms", "5 chambres"
    const roomMatch = q.match(/(\d+)\s*(?:room|bedroom|chambre|piece|pièce)/i);
    if (roomMatch) params.minRooms = parseInt(roomMatch[1], 10);

    // Detect "more than N rooms" / "at least N rooms"
    const moreRoomsMatch = q.match(/(?:more than|at least|above|greater than|plus de|au moins)\s*(\d+)\s*(?:room|bedroom)/i);
    if (moreRoomsMatch) params.minRooms = parseInt(moreRoomsMatch[1], 10) + 1;

    return params;
  }

  // ─── Groq AI parser ───────────────────────────────────────────────────────
  private async parseWithGroq(query: string, preParams: Partial<ParsedSearchParams>): Promise<ParsedSearchParams> {
    const groqApiKey = this.configService.get<string>('groqApiKey') || process.env.GROQ_API_KEY || '';

    const systemPrompt = `You are an intelligent search assistant for BAZA Marketplace — Rwanda's property & vehicle marketplace.

Parse the user's query into structured JSON filters. Use smart reasoning to understand intent.

CATEGORY SLUGS (only use these exact values):
- "vehicles" → any car, truck, motorcycle, SUV, pickup, Toyota, Honda, Mazda, BMW, Nissan, Kia, Hyundai, etc.
- "houses" → house, home, villa, bungalow, building, mansion, inzu (Kinyarwanda for house)
- "apartments" → apartment, flat, studio, bedsitter, self-contained
- "land-plots" → land, plot, terrain, ubutaka (Kinyarwanda for land)
- "commercial" → office, shop, warehouse, commercial space, boutique

LOCATION (Rwanda):
- Sectors: Kanombe, Gacuriro, Kimihurura, Nyarutarama, Kacyiru, Remera, Gisozi, Kibagabaga, Nyamirambo, Gitega, Rubavu, Musanze, Huye, Butare
- Districts: Gasabo, Kicukiro, Nyarugenge, Rubavu, Gicumbi, Rwamagana, Huye, Musanze, Ngoma
- Provinces: "Kigali City", "Northern Province", "Southern Province", "Eastern Province", "Western Province"

RULES:
1. "cars" = vehicles, "car" = vehicles, "Toyota" = vehicles
2. "houses" = houses category, "home" = houses category
3. "for rent" or "to rent" or "gukodesha" = purpose RENT
4. "for sale" or "buy" or "purchase" = purpose SALE
5. Extract room count if mentioned (e.g. "3 rooms", "more than 2 bedrooms", "at least 4 rooms")
6. categoryKeywords = list of synonyms/words from the query that describe the type (helps text search)
7. freeTextSearch = only use if user mentions very specific things like brand/model (e.g. "Toyota RAV4 2020")
8. confidence = HIGH if you are sure, MEDIUM if partially sure, LOW if guessing
9. aiExplanation = friendly one sentence describing what you found

Respond ONLY with valid JSON:
{
  "categorySlug": "vehicles" | "houses" | "apartments" | "land-plots" | "commercial" | null,
  "categoryKeywords": ["car", "vehicle", "auto"],
  "purpose": "SALE" | "RENT" | null,
  "province": null,
  "district": null,
  "sector": null,
  "minPrice": null,
  "maxPrice": null,
  "minRooms": null,
  "freeTextSearch": null,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "aiExplanation": "Showing vehicles for sale in Kanombe under 15M RWF."
}`;

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse this search: "${query}"` },
          ],
          temperature: 0.05,
          max_tokens: 350,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Groq error ${response.status} — using pre-processed params`);
        return this.buildFromPreParams(query, preParams);
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) return this.buildFromPreParams(query, preParams);

      const ai = JSON.parse(content);

      // Merge AI result with pre-processed params (pre-params win for safety)
      return {
        categorySlug: preParams.categorySlug || ai.categorySlug || undefined,
        categoryKeywords: ai.categoryKeywords || [],
        purpose: preParams.purpose || ai.purpose || undefined,
        province: ai.province || undefined,
        district: ai.district || undefined,
        sector: ai.sector || undefined,
        minPrice: ai.minPrice ? Number(ai.minPrice) : undefined,
        maxPrice: ai.maxPrice ? Number(ai.maxPrice) : undefined,
        minRooms: preParams.minRooms || (ai.minRooms ? Number(ai.minRooms) : undefined),
        freeTextSearch: ai.freeTextSearch || undefined,
        aiExplanation: ai.aiExplanation || `Showing results for "${query}"`,
        confidence: ai.confidence || 'MEDIUM',
      };
    } catch (err) {
      this.logger.error('Groq parse failed', err);
      return this.buildFromPreParams(query, preParams);
    }
  }

  private buildFromPreParams(query: string, pre: Partial<ParsedSearchParams>): ParsedSearchParams {
    return {
      ...pre,
      freeTextSearch: query,
      aiExplanation: `Showing results for "${query}"`,
      confidence: 'LOW',
    };
  }

  // ─── Fallback search strategy ─────────────────────────────────────────────
  private async searchWithFallback(params: ParsedSearchParams, rawQuery: string) {
    // Strategy 1: Full filters
    let results = await this.executeSearch(params, 'FULL');
    if (results.length > 0) return { results, strategy: 'full_filters' };

    // Strategy 2: Drop freeText, keep structured filters only
    if (params.freeTextSearch) {
      results = await this.executeSearch({ ...params, freeTextSearch: undefined }, 'STRUCTURED_ONLY');
      if (results.length > 0) return { results, strategy: 'structured_filters' };
    }

    // Strategy 3: Category + Location only (drop price, rooms, purpose)
    if (params.categorySlug || params.sector || params.district) {
      results = await this.executeSearch({
        categorySlug: params.categorySlug,
        sector: params.sector,
        district: params.district,
        province: params.province,
        aiExplanation: params.aiExplanation,
        confidence: 'LOW',
      }, 'BROAD');
      if (results.length > 0) return { results, strategy: 'broad_category_location' };
    }

    // Strategy 4: Category keywords text search
    if (params.categoryKeywords && params.categoryKeywords.length > 0) {
      results = await this.executeKeywordSearch(params.categoryKeywords);
      if (results.length > 0) return { results, strategy: 'keyword_fallback' };
    }

    // Strategy 5: Raw query text search — last resort
    results = await this.executeKeywordSearch([rawQuery]);
    return { results, strategy: 'raw_text_fallback' };
  }

  // ─── Main search executor ─────────────────────────────────────────────────
  private async executeSearch(params: Partial<ParsedSearchParams>, _mode: string) {
    const qb = this.buildBase();

    // Category filter (most important — use category join, not text)
    if (params.categorySlug) {
      qb.andWhere('category.slug = :catSlug', { catSlug: params.categorySlug });
    }

    // Location filters (sector > district > province)
    if (params.sector) {
      qb.andWhere('LOWER(location.sector) LIKE :sector', { sector: `%${params.sector.toLowerCase()}%` });
    } else if (params.district) {
      qb.andWhere('LOWER(location.district) LIKE :district', { district: `%${params.district.toLowerCase()}%` });
    } else if (params.province) {
      qb.andWhere('LOWER(location.province) LIKE :province', { province: `%${params.province.toLowerCase()}%` });
    }

    // Purpose
    if (params.purpose) {
      qb.andWhere('listing.purpose = :purpose', { purpose: params.purpose });
    }

    // Price range
    if (params.minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice: params.minPrice });
    }
    if (params.maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice: params.maxPrice });
    }

    // Rooms: search for any number >= minRooms in description
    if (params.minRooms !== undefined) {
      const roomPatterns: string[] = [];
      const roomParams: Record<string, string> = {};
      // Match any room count >= minRooms up to 20
      for (let r = params.minRooms; r <= 20; r++) {
        const key = `room${r}`;
        roomPatterns.push(
          `LOWER(listing.description) LIKE :${key}a OR LOWER(listing.title) LIKE :${key}b OR LOWER(listing.description) LIKE :${key}c`,
        );
        roomParams[`${key}a`] = `%${r} room%`;
        roomParams[`${key}b`] = `%${r} room%`;
        roomParams[`${key}c`] = `%${r} bedroom%`;
      }
      qb.andWhere(`(${roomPatterns.join(' OR ')})`, roomParams);
    }

    // Free text search (only if provided)
    if (params.freeTextSearch) {
      const t = params.freeTextSearch.toLowerCase();
      qb.andWhere(
        '(LOWER(listing.title) LIKE :ft OR LOWER(listing.description) LIKE :ft)',
        { ft: `%${t}%` },
      );
    }

    return this.runAndMap(qb);
  }

  // Keyword search across title + description using OR on multiple terms
  private async executeKeywordSearch(terms: string[]) {
    const qb = this.buildBase();
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    terms.forEach((term, i) => {
      const words = term.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      words.forEach((word, j) => {
        const key = `kw_${i}_${j}`;
        conditions.push(`LOWER(listing.title) LIKE :${key} OR LOWER(listing.description) LIKE :${key}`);
        params[key] = `%${word}%`;
      });
    });

    if (conditions.length === 0) return [];
    qb.andWhere(`(${conditions.join(' OR ')})`, params);
    return this.runAndMap(qb);
  }

  // ─── Shared builder ───────────────────────────────────────────────────────
  private buildBase(): SelectQueryBuilder<Listing> {
    return this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.owner', 'owner')
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.location', 'location')
      .where('listing.status = :status', { status: ListingStatus.PUBLISHED })
      .orderBy('listing.isFeatured', 'DESC')
      .addOrderBy('listing.isVerified', 'DESC')
      .addOrderBy('listing.publishedAt', 'DESC')
      .take(20);
  }

  private async runAndMap(qb: SelectQueryBuilder<Listing>) {
    const listings = await qb.getMany();
    return listings.map((l) => {
      const locationParts = l.location
        ? [l.location.sector, l.location.district, l.location.province].filter(Boolean)
        : [];
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        description: l.description?.substring(0, 150) || '',
        price: Number(l.price),
        currency: l.currency,
        purpose: l.purpose,
        status: l.status,
        category: l.category?.name ?? '',
        categorySlug: l.category?.slug ?? '',
        location: locationParts.join(', '),
        locationShort: locationParts[0] || locationParts[1] || '',
        coverImageUrl: l.coverImageUrl ?? '',
        isFeatured: l.isFeatured,
        isVerified: l.isVerified,
        ownerName: l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : '',
        createdAt: l.createdAt?.toISOString() ?? '',
        publishedAt: l.publishedAt?.toISOString() ?? null,
      };
    });
  }
}
