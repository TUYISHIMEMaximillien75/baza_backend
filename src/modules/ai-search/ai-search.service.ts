import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import fetch from 'node-fetch';
import { Listing } from '../listings/entities/listing.entity';
import { ListingStatus } from '../../common/enums';

interface ParsedSearchParams {
  search?: string;
  province?: string;
  district?: string;
  sector?: string;
  purpose?: 'SALE' | 'RENT';
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  keywords?: string[];
  aiExplanation: string;
}

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly groqApiKey: string;
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {
    this.groqApiKey = this.configService.get<string>('groqApiKey') || process.env.GROQ_API_KEY || '';
  }

  async search(userQuery: string) {
    // Step 1: Parse the natural language query with Groq
    const parsed = await this.parseQueryWithAI(userQuery);

    // Step 2: Build and execute a DB query using the parsed params
    const results = await this.searchListings(parsed);

    return {
      query: userQuery,
      aiExplanation: parsed.aiExplanation,
      parsedFilters: {
        search: parsed.search,
        province: parsed.province,
        district: parsed.district,
        purpose: parsed.purpose,
        categorySlug: parsed.categorySlug,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
      },
      results,
    };
  }

  private async parseQueryWithAI(query: string): Promise<ParsedSearchParams> {
    const systemPrompt = `You are a smart search assistant for BAZA Marketplace — Rwanda's premier property and vehicle listing platform.

Your job is to parse a user's natural language search query into structured search filters for a PostgreSQL database.

Available filters you can extract:
- search: general keyword string to search in listing title and description
- province: Rwandan province name (e.g. "Kigali City", "Northern Province", "Southern Province", "Eastern Province", "Western Province")
- district: district name (e.g. "Gasabo", "Kicukiro", "Nyarugenge", "Rubavu")
- sector: sector name (e.g. "Kanombe", "Gacuriro", "Kimihurura", "Nyarutarama")
- purpose: either "SALE" or "RENT"
- categorySlug: one of: "houses", "land-plots", "vehicles", "apartments", "commercial"
- minPrice: minimum price in RWF (integer)
- maxPrice: maximum price in RWF (integer)
- minRooms: minimum number of rooms/bedrooms mentioned
- keywords: array of key terms to search in descriptions

IMPORTANT RULES:
- If the user says "Kanombe", it is a sector in Kigali City (Kicukiro district)
- If the user says "Gacuriro", it is a sector in Gasabo district
- If the user mentions rooms, extract the number for minRooms
- If user says "buy" or "purchase" or "for sale", set purpose to "SALE"
- If user says "rent" or "to rent" or "for rent", set purpose to "RENT"
- If user says "house" or "building" or "home", set categorySlug to "houses"
- If user says "apartment" or "flat", set categorySlug to "apartments"
- If user says "land" or "plot" or "terrain", set categorySlug to "land-plots"
- If user says "car" or "vehicle" or "truck", set categorySlug to "vehicles"
- Generate a friendly one-sentence aiExplanation in English describing what you are searching for

Always respond with valid JSON only. No extra text. Example format:
{
  "search": "house rooms",
  "province": "Kigali City",
  "district": "Kicukiro",
  "sector": "Kanombe",
  "purpose": null,
  "categorySlug": "houses",
  "minPrice": null,
  "maxPrice": null,
  "minRooms": 3,
  "keywords": ["rooms", "house"],
  "aiExplanation": "Showing houses in Kanombe with at least 3 rooms."
}`;

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse this search query: "${query}"` },
          ],
          temperature: 0.1,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`Groq API error: ${err}`);
        return this.fallbackParse(query);
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) return this.fallbackParse(query);

      const parsed = JSON.parse(content);
      return {
        search: parsed.search || query,
        province: parsed.province || undefined,
        district: parsed.district || undefined,
        sector: parsed.sector || undefined,
        purpose: parsed.purpose || undefined,
        categorySlug: parsed.categorySlug || undefined,
        minPrice: parsed.minPrice ? Number(parsed.minPrice) : undefined,
        maxPrice: parsed.maxPrice ? Number(parsed.maxPrice) : undefined,
        minRooms: parsed.minRooms ? Number(parsed.minRooms) : undefined,
        keywords: parsed.keywords || [],
        aiExplanation: parsed.aiExplanation || `Showing results for: "${query}"`,
      };
    } catch (error) {
      this.logger.error('Failed to parse query with AI', error);
      return this.fallbackParse(query);
    }
  }

  private fallbackParse(query: string): ParsedSearchParams {
    return {
      search: query,
      aiExplanation: `Showing results for: "${query}"`,
    };
  }

  private async searchListings(params: ParsedSearchParams) {
    const qb = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.owner', 'owner')
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.location', 'location')
      .where('listing.status = :status', { status: ListingStatus.PUBLISHED });

    // Build keyword search from title, description, and extracted keywords
    if (params.search) {
      const searchTerms = [params.search, ...(params.keywords || [])].filter(Boolean);
      const searchConditions = searchTerms.map((_, i) => 
        `(LOWER(listing.title) LIKE :term${i} OR LOWER(listing.description) LIKE :term${i})`
      );
      const searchParams: Record<string, string> = {};
      searchTerms.forEach((term, i) => {
        searchParams[`term${i}`] = `%${term.toLowerCase()}%`;
      });
      if (searchConditions.length > 0) {
        qb.andWhere(`(${searchConditions.join(' OR ')})`, searchParams);
      }
    }

    // Location filters
    if (params.sector) {
      qb.andWhere('LOWER(location.sector) LIKE :sector', {
        sector: `%${params.sector.toLowerCase()}%`,
      });
    } else if (params.district) {
      qb.andWhere('LOWER(location.district) LIKE :district', {
        district: `%${params.district.toLowerCase()}%`,
      });
    } else if (params.province) {
      qb.andWhere('LOWER(location.province) LIKE :province', {
        province: `%${params.province.toLowerCase()}%`,
      });
    }

    // Purpose
    if (params.purpose) {
      qb.andWhere('listing.purpose = :purpose', { purpose: params.purpose });
    }

    // Category
    if (params.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug: params.categorySlug });
    }

    // Price range
    if (params.minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice: params.minPrice });
    }
    if (params.maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice: params.maxPrice });
    }

    // Room count — search in description for number of rooms
    if (params.minRooms !== undefined) {
      qb.andWhere(
        `(LOWER(listing.description) LIKE :roomKw OR LOWER(listing.title) LIKE :roomKw)`,
        { roomKw: `%${params.minRooms} room%` }
      );
    }

    qb.orderBy('listing.isFeatured', 'DESC').addOrderBy('listing.publishedAt', 'DESC').take(20);

    const listings = await qb.getMany();

    return listings.map((listing) => {
      const locationStr = listing.location
        ? [listing.location.sector, listing.location.district, listing.location.province]
            .filter(Boolean)
            .join(', ')
        : '';
      return {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        description: listing.description?.substring(0, 200),
        price: Number(listing.price),
        currency: listing.currency,
        purpose: listing.purpose,
        category: listing.category?.name ?? '',
        categorySlug: listing.category?.slug ?? '',
        location: locationStr,
        coverImageUrl: listing.coverImageUrl ?? '',
        isFeatured: listing.isFeatured,
        isVerified: listing.isVerified,
        createdAt: listing.createdAt?.toISOString() ?? '',
      };
    });
  }
}
