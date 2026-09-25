const https = require('https');

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_oRLI0Gc5XZwe@ep-blue-haze-ay3vbkph-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

function queryNeon(sqlQuery, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sqlQuery, params });
    const req = https.request({
      hostname: 'ep-blue-haze-ay3vbkph-pooler.c-5.us-east-2.aws.neon.tech',
      port: 443,
      family: 4,
      path: '/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Neon-Connection-String': NEON_CONN_STRING
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400 || json.message) {
            reject(new Error(json.message || `HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(json.rows);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runSeed() {
  console.log('🚀 Connecting to Neon PostgreSQL and setting up database...');

  // 1. Create Enums if not exist
  const createEnums = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_requests_verificationtype_enum') THEN CREATE TYPE "public"."verification_requests_verificationtype_enum" AS ENUM('SELLER', 'BROKER', 'DEALER'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_requests_status_enum') THEN CREATE TYPE "public"."verification_requests_status_enum" AS ENUM('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listings_purpose_enum') THEN CREATE TYPE "public"."listings_purpose_enum" AS ENUM('SALE', 'RENT'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listings_status_enum') THEN CREATE TYPE "public"."listings_status_enum" AS ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'SOLD', 'RENTED', 'SUSPENDED', 'ARCHIVED'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_requests_status_enum') THEN CREATE TYPE "public"."visit_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED', 'REJECTED', 'CANCELLED', 'COMPLETED'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reports_status_enum') THEN CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'); END IF; END $$;`
  ];

  for (const sql of createEnums) {
    await queryNeon(sql);
  }
  console.log('  [+] Enums created/verified.');

  // 2. Create Tables
  const createTables = [
    `CREATE TABLE IF NOT EXISTS "roles" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "name" character varying(50) NOT NULL,
      "description" character varying(255),
      CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
      CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "firstName" character varying(100) NOT NULL,
      "lastName" character varying(100) NOT NULL,
      "email" character varying(255) NOT NULL,
      "phoneNumber" character varying(20),
      "passwordHash" character varying(255) NOT NULL,
      "profileImageUrl" character varying(500),
      "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE',
      "emailVerified" boolean NOT NULL DEFAULT false,
      "phoneVerified" boolean NOT NULL DEFAULT false,
      "lastLoginAt" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE IF NOT EXISTS "user_roles" (
      "user_id" uuid NOT NULL,
      "role_id" uuid NOT NULL,
      CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
      CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "user_profiles" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "userId" uuid NOT NULL,
      "bio" text,
      "province" character varying(100),
      "district" character varying(100),
      "sector" character varying(100),
      "address" character varying(255),
      "preferredLanguage" character varying(10) NOT NULL DEFAULT 'en',
      CONSTRAINT "UQ_user_profiles_userId" UNIQUE ("userId"),
      CONSTRAINT "PK_user_profiles_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "verification_requests" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "userId" uuid NOT NULL,
      "verificationType" "public"."verification_requests_verificationtype_enum" NOT NULL,
      "status" "public"."verification_requests_status_enum" NOT NULL DEFAULT 'PENDING',
      "submittedAt" TIMESTAMP WITH TIME ZONE,
      "reviewedAt" TIMESTAMP WITH TIME ZONE,
      "reviewedById" uuid,
      "rejectionReason" text,
      CONSTRAINT "PK_verification_requests_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_verification_requests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_verification_requests_reviewer" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "categories" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "name" character varying(100) NOT NULL,
      "slug" character varying(120) NOT NULL,
      "description" text,
      "icon" character varying(100),
      "isActive" boolean NOT NULL DEFAULT true,
      "parentId" uuid,
      CONSTRAINT "UQ_categories_slug" UNIQUE ("slug"),
      CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "locations" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "province" character varying(100) NOT NULL,
      "district" character varying(100) NOT NULL,
      "sector" character varying(100) NOT NULL,
      "cell" character varying(100),
      "village" character varying(100),
      "latitude" numeric(10,7),
      "longitude" numeric(10,7),
      CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE IF NOT EXISTS "listings" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "ownerId" uuid NOT NULL,
      "categoryId" uuid NOT NULL,
      "locationId" uuid,
      "title" character varying(255) NOT NULL,
      "slug" character varying(255) NOT NULL,
      "description" text NOT NULL,
      "price" numeric(14,2) NOT NULL,
      "currency" character varying(10) NOT NULL DEFAULT 'RWF',
      "purpose" "public"."listings_purpose_enum" NOT NULL DEFAULT 'SALE',
      "status" "public"."listings_status_enum" NOT NULL DEFAULT 'DRAFT',
      "coverImageUrl" character varying(500),
      "isFeatured" boolean NOT NULL DEFAULT false,
      "isVerified" boolean NOT NULL DEFAULT false,
      "publishedAt" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "UQ_listings_slug" UNIQUE ("slug"),
      CONSTRAINT "PK_listings_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_listings_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_listings_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_listings_location" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "listing_images" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "listingId" uuid NOT NULL,
      "imageUrl" character varying(500) NOT NULL,
      "publicId" character varying(255),
      "altText" character varying(255),
      "displayOrder" integer NOT NULL DEFAULT 0,
      "isCover" boolean NOT NULL DEFAULT false,
      CONSTRAINT "PK_listing_images_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_listing_images_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "saved_listings" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "listingId" uuid NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_saved_listings_user_listing" UNIQUE ("userId", "listingId"),
      CONSTRAINT "PK_saved_listings_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_saved_listings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_saved_listings_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "contact_requests" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "listingId" uuid NOT NULL,
      "senderId" uuid,
      "receiverId" uuid NOT NULL,
      "name" character varying(100) NOT NULL,
      "phoneNumber" character varying(20) NOT NULL,
      "email" character varying(255),
      "message" text NOT NULL,
      "status" character varying(50) NOT NULL DEFAULT 'PENDING',
      CONSTRAINT "PK_contact_requests_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_contact_requests_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_contact_requests_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_contact_requests_receiver" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "visit_requests" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "listingId" uuid NOT NULL,
      "requesterId" uuid NOT NULL,
      "sellerId" uuid NOT NULL,
      "preferredDate" DATE NOT NULL,
      "preferredTime" character varying(50),
      "message" text,
      "status" "public"."visit_requests_status_enum" NOT NULL DEFAULT 'PENDING',
      CONSTRAINT "PK_visit_requests_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_visit_requests_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_visit_requests_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_visit_requests_seller" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "title" character varying(255) NOT NULL,
      "message" text NOT NULL,
      "type" character varying(50) NOT NULL,
      "isRead" boolean NOT NULL DEFAULT false,
      "referenceId" uuid,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "reports" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "deletedAt" TIMESTAMP WITH TIME ZONE,
      "listingId" uuid NOT NULL,
      "reportedById" uuid NOT NULL,
      "reason" character varying(100) NOT NULL,
      "description" text,
      "status" "public"."reports_status_enum" NOT NULL DEFAULT 'PENDING',
      "reviewedById" uuid,
      "reviewedAt" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_reports_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_reports_reporter" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_reports_reviewer" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL
    );`
  ];

  for (const tableSql of createTables) {
    await queryNeon(tableSql);
  }
  console.log('  [+] All 13 tables verified/created.');

  // 3. Seed Roles
  const roles = [
    { name: 'USER', description: 'Standard platform buyer/renter user' },
    { name: 'SELLER', description: 'Individual seller or landlord' },
    { name: 'BROKER', description: 'Licensed property broker' },
    { name: 'DEALER', description: 'Commercial vehicle dealership' },
    { name: 'ADMIN', description: 'Platform moderator and administrator' },
    { name: 'SUPER_ADMIN', description: 'Full system administrator' }
  ];

  const roleMap = {};
  for (const r of roles) {
    const existing = await queryNeon(`SELECT id FROM "roles" WHERE "name" = $1 LIMIT 1`, [r.name]);
    if (existing && existing.length > 0) {
      roleMap[r.name] = existing[0].id;
    } else {
      const inserted = await queryNeon(
        `INSERT INTO "roles" ("name", "description") VALUES ($1, $2) RETURNING id`,
        [r.name, r.description]
      );
      roleMap[r.name] = inserted[0].id;
      console.log(`  [+] Inserted Role: ${r.name}`);
    }
  }

  // 4. Seed Categories
  const mainCategories = [
    { name: 'Property', slug: 'property', description: 'Houses, apartments, and commercial spaces for sale or rent', icon: 'building' },
    { name: 'Land', slug: 'land', description: 'Residential, agricultural, and commercial plots', icon: 'map-pin' },
    { name: 'Vehicle', slug: 'vehicle', description: 'Cars, SUVs, trucks, and motorcycles for sale or lease', icon: 'car' }
  ];

  const catMap = {};
  for (const c of mainCategories) {
    const existing = await queryNeon(`SELECT id FROM "categories" WHERE "slug" = $1 LIMIT 1`, [c.slug]);
    if (existing && existing.length > 0) {
      catMap[c.slug] = existing[0].id;
    } else {
      const inserted = await queryNeon(
        `INSERT INTO "categories" ("name", "slug", "description", "icon") VALUES ($1, $2, $3, $4) RETURNING id`,
        [c.name, c.slug, c.description, c.icon]
      );
      catMap[c.slug] = inserted[0].id;
      console.log(`  [+] Inserted Category: ${c.name}`);
    }
  }

  const subCategories = [
    { name: 'Houses', slug: 'houses', description: 'Single family homes and luxury villas', parentSlug: 'property', icon: 'home' },
    { name: 'Apartments', slug: 'apartments', description: 'Apartments and studio flats', parentSlug: 'property', icon: 'layers' },
    { name: 'Commercial', slug: 'commercial', description: 'Office spaces, retail shops, warehouses', parentSlug: 'property', icon: 'briefcase' },
    { name: 'Residential Land', slug: 'residential-land', description: 'Zoned residential plots', parentSlug: 'land', icon: 'map' },
    { name: 'Agricultural Land', slug: 'agricultural-land', description: 'Farming and rural land plots', parentSlug: 'land', icon: 'sun' },
    { name: 'Sedans & Hatchbacks', slug: 'sedans', description: 'Compact and luxury passenger cars', parentSlug: 'vehicle', icon: 'car' },
    { name: 'SUVs & 4x4', slug: 'suvs', description: 'Off-road crossover and SUV vehicles', parentSlug: 'vehicle', icon: 'shield' },
    { name: 'Trucks & Commercial', slug: 'trucks', description: 'Light trucks, vans, and heavy machinery', parentSlug: 'vehicle', icon: 'truck' }
  ];

  for (const sub of subCategories) {
    const existing = await queryNeon(`SELECT id FROM "categories" WHERE "slug" = $1 LIMIT 1`, [sub.slug]);
    if (existing && existing.length > 0) {
      catMap[sub.slug] = existing[0].id;
    } else {
      const parentId = catMap[sub.parentSlug];
      const inserted = await queryNeon(
        `INSERT INTO "categories" ("name", "slug", "description", "icon", "parentId") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [sub.name, sub.slug, sub.description, sub.icon, parentId]
      );
      catMap[sub.slug] = inserted[0].id;
      console.log(`  [+] Inserted Subcategory: ${sub.name}`);
    }
  }

  // 5. Seed Locations
  const sampleLocations = [
    { province: 'Kigali City', district: 'Gasabo', sector: 'Kimironko', cell: 'Kibagabaga', village: 'Nyagatovu', latitude: -1.9400, longitude: 30.1250 },
    { province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kimatironko', village: 'Kagugu', latitude: -1.9250, longitude: 30.0833 },
    { province: 'Kigali City', district: 'Gasabo', sector: 'Gisozi', cell: 'Musezero', village: 'Ruhango', latitude: -1.9180, longitude: 30.0650 },
    { province: 'Kigali City', district: 'Kicukiro', sector: 'Nyarugunga', cell: 'Nonko', village: 'Kanombe', latitude: -1.9680, longitude: 30.1420 },
    { province: 'Kigali City', district: 'Kicukiro', sector: 'Niboye', cell: 'Gatare', village: 'Niboye', latitude: -1.9750, longitude: 30.1000 },
    { province: 'Kigali City', district: 'Nyarugenge', sector: 'Nyamirambo', cell: 'Rwezamenyo', village: 'Biryogo', latitude: -1.9711, longitude: 30.0520 },
    { province: 'Western Province', district: 'Rubavu', sector: 'Gisenyi', cell: 'Nyakiliba', village: 'Gisenyi', latitude: -1.7028, longitude: 29.2564 },
    { province: 'Northern Province', district: 'Musanze', sector: 'Muhoza', cell: 'Ruhengeri', village: 'Kigombe', latitude: -1.4989, longitude: 29.6339 }
  ];

  const locMap = [];
  for (const loc of sampleLocations) {
    const existing = await queryNeon(
      `SELECT id FROM "locations" WHERE "province" = $1 AND "district" = $2 AND "sector" = $3 AND "cell" = $4 LIMIT 1`,
      [loc.province, loc.district, loc.sector, loc.cell]
    );
    if (existing && existing.length > 0) {
      locMap.push(existing[0].id);
    } else {
      const inserted = await queryNeon(
        `INSERT INTO "locations" ("province", "district", "sector", "cell", "village", "latitude", "longitude") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [loc.province, loc.district, loc.sector, loc.cell, loc.village, loc.latitude, loc.longitude]
      );
      locMap.push(inserted[0].id);
      console.log(`  [+] Inserted Location: ${loc.province} -> ${loc.district} -> ${loc.sector}`);
    }
  }

  // 6. Seed Demo Users
  const demoUsers = [
    {
      firstName: 'Jean-Luc',
      lastName: 'Nkurunziza',
      email: 'jeanluc.broker@baza.rw',
      phoneNumber: '+250788123456',
      passwordHash: '$2b$10$e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Z', // dummy hash
      profileImageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      bio: 'Licensed Senior Real Estate Broker with 8+ years experience in Kigali high-end properties.',
      role: 'BROKER'
    },
    {
      firstName: 'Aline',
      lastName: 'Umutoni',
      email: 'aline.seller@baza.rw',
      phoneNumber: '+250788654321',
      passwordHash: '$2b$10$e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Z',
      profileImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      bio: 'Property investor and landlord managing modern residential apartments in Kigali.',
      role: 'SELLER'
    },
    {
      firstName: 'Eric',
      lastName: 'Manzi',
      email: 'eric.dealer@baza.rw',
      phoneNumber: '+250789987654',
      passwordHash: '$2b$10$e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Z',
      profileImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
      bio: 'Managing Director at Kigali Auto Motors. Verified vehicle dealer in Rwanda.',
      role: 'DEALER'
    },
    {
      firstName: 'Grace',
      lastName: 'Uwase',
      email: 'grace.buyer@baza.rw',
      phoneNumber: '+250785112233',
      passwordHash: '$2b$10$e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Zq7j9z8y7X6e8T7lJzFj1Z',
      profileImageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      bio: 'Looking to purchase family residence and investment plots in Rwanda.',
      role: 'USER'
    }
  ];

  const userMap = {};
  for (const u of demoUsers) {
    let existing = await queryNeon(`SELECT id FROM "users" WHERE "email" = $1 LIMIT 1`, [u.email]);
    let userId;
    if (existing && existing.length > 0) {
      userId = existing[0].id;
    } else {
      const inserted = await queryNeon(
        `INSERT INTO "users" ("firstName", "lastName", "email", "phoneNumber", "passwordHash", "profileImageUrl", "emailVerified", "phoneVerified") VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING id`,
        [u.firstName, u.lastName, u.email, u.phoneNumber, u.passwordHash, u.profileImageUrl]
      );
      userId = inserted[0].id;
      
      // User Profile
      await queryNeon(
        `INSERT INTO "user_profiles" ("userId", "bio", "province", "district", "sector", "address") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [userId, u.bio, 'Kigali City', 'Gasabo', 'Kacyiru', 'KG 7 Ave']
      );

      // User Role
      if (roleMap[u.role]) {
        await queryNeon(
          `INSERT INTO "user_roles" ("user_id", "role_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, roleMap[u.role]]
        );
      }
      console.log(`  [+] Inserted Demo User: ${u.firstName} ${u.lastName} (${u.role})`);
    }
    userMap[u.email] = userId;
  }

  // 7. Seed Verified Badges
  const verificationData = [
    { userId: userMap['jeanluc.broker@baza.rw'], type: 'BROKER', status: 'APPROVED' },
    { userId: userMap['eric.dealer@baza.rw'], type: 'DEALER', status: 'APPROVED' }
  ];

  for (const v of verificationData) {
    await queryNeon(
      `INSERT INTO "verification_requests" ("userId", "verificationType", "status", "submittedAt", "reviewedAt") VALUES ($1, $2, $3, now(), now())`,
      [v.userId, v.type, v.status]
    );
  }

  // 8. Seed Meaningful Demo Listings
  const demoListings = [
    {
      title: 'Luxury 4-Bedroom Villa with Swimming Pool in Kibagabaga',
      slug: 'luxury-4-bedroom-villa-kibagabaga-kigali',
      description: 'Stunning modern 4-bedroom villa featuring a private swimming pool, landscaped garden, panoramic views of Kigali city, high-end imported kitchen finishes, staff quarters, and full perimeter security. Located in the peaceful neighborhood of Kibagabaga.',
      price: 280000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      ownerEmail: 'jeanluc.broker@baza.rw',
      categorySlug: 'houses',
      locationIndex: 0,
      coverImageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200',
      isFeatured: true,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200'
      ]
    },
    {
      title: 'Modern 2-Bedroom Furnished Apartment in Kacyiru',
      slug: 'modern-2-bedroom-furnished-apartment-kacyiru',
      description: 'Fully furnished executive 2-bedroom, 2-bathroom apartment with balcony. Includes high-speed fiber internet, 24/7 security guard, standby generator, underground parking, and daily housekeeping. Walking distance to US Embassy and ministries.',
      price: 850000,
      currency: 'RWF',
      purpose: 'RENT',
      status: 'PUBLISHED',
      ownerEmail: 'aline.seller@baza.rw',
      categorySlug: 'apartments',
      locationIndex: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      isFeatured: true,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200'
      ]
    },
    {
      title: 'Prime Residential Land Plot (800 sqm) in Gisozi',
      slug: 'prime-residential-land-plot-gisozi-kigali',
      description: 'Flat, ready-to-build R2 zoned residential land plot measuring 800 square meters in Gisozi. Clean title deed (UPI registered), water and electricity connection on site, cobblestone access road.',
      price: 45000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      ownerEmail: 'jeanluc.broker@baza.rw',
      categorySlug: 'residential-land',
      locationIndex: 2,
      coverImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
      isFeatured: false,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
        'https://images.unsplash.com/photo-1628744876497-eb30460be9f6?w=1200'
      ]
    },
    {
      title: 'Toyota RAV4 Hybrid 2022 (Mint Condition, Low Mileage)',
      slug: 'toyota-rav4-hybrid-2022-kigali',
      description: 'Imported Toyota RAV4 Hybrid AWD 2022 model. Features leather seats, sunroof, 360-degree camera, Toyota Safety Sense, keyless entry, and exceptional fuel economy (4.8L/100km). Full duty paid in Rwanda with 28,000 km original mileage.',
      price: 32000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      ownerEmail: 'eric.dealer@baza.rw',
      categorySlug: 'suvs',
      locationIndex: 3,
      coverImageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200',
      isFeatured: true,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200',
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200'
      ]
    },
    {
      title: 'Commercial Office Space (350 sqm) on Airport Road, Kanombe',
      slug: 'commercial-office-space-350-sqm-kanombe',
      description: 'Open-plan modern commercial office floor ideal for corporate headquarters, IT hub, or financial institution. Equipped with central AC, elevator, 50 dedicated parking spaces, fiber network infrastructure, and backup generator.',
      price: 3500000,
      currency: 'RWF',
      purpose: 'RENT',
      status: 'PUBLISHED',
      ownerEmail: 'aline.seller@baza.rw',
      categorySlug: 'commercial',
      locationIndex: 3,
      coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
      isFeatured: false,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200'
      ]
    },
    {
      title: 'Scenic Lake View Land Plot (1,500 sqm) in Gisenyi, Rubavu',
      slug: 'scenic-lake-view-land-gisenyi-rubavu',
      description: 'Breathtaking prime land parcel directly overlooking Lake Kivu in Rubavu district. Ideal for luxury resort development, boutique hotel, or eco-villas. Fully registered title deed with commercial tourism zoning approval.',
      price: 65000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      ownerEmail: 'jeanluc.broker@baza.rw',
      categorySlug: 'residential-land',
      locationIndex: 6,
      coverImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      isFeatured: true,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200'
      ]
    },
    {
      title: 'Toyota Hilux Double Cab 2021 4x4 Diesel Pickup',
      slug: 'toyota-hilux-double-cab-2021-4x4-rwanda',
      description: 'Robust 2021 Toyota Hilux 2.8L Turbo Diesel 4x4 Double Cab. Perfect for field operations, construction, or off-road adventure. Bull bar, winch, canopy, tow hook, and heavy-duty suspension installed.',
      price: 38500000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      ownerEmail: 'eric.dealer@baza.rw',
      categorySlug: 'trucks',
      locationIndex: 7,
      coverImageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200',
      isFeatured: false,
      isVerified: true,
      images: [
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200',
        'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1200'
      ]
    },
    {
      title: 'Cozy Studio Apartment near Stade Amahoro, Remera',
      slug: 'cozy-studio-apartment-remera-kigali',
      description: 'Charming self-contained studio apartment featuring kitchenette, hot water shower, private entrance, and balcony. Conveniently located 2 minutes from BK Arena and Amahoro Stadium.',
      price: 350000,
      currency: 'RWF',
      purpose: 'RENT',
      status: 'PUBLISHED',
      ownerEmail: 'aline.seller@baza.rw',
      categorySlug: 'apartments',
      locationIndex: 4,
      coverImageUrl: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200',
      isFeatured: false,
      isVerified: false,
      images: [
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200'
      ]
    }
  ];

  for (const item of demoListings) {
    const existing = await queryNeon(`SELECT id FROM "listings" WHERE "slug" = $1 LIMIT 1`, [item.slug]);
    let listingId;
    if (existing && existing.length > 0) {
      listingId = existing[0].id;
    } else {
      const ownerId = userMap[item.ownerEmail];
      const categoryId = catMap[item.categorySlug];
      const locationId = locMap[item.locationIndex];

      const inserted = await queryNeon(
        `INSERT INTO "listings" ("ownerId", "categoryId", "locationId", "title", "slug", "description", "price", "currency", "purpose", "status", "coverImageUrl", "isFeatured", "isVerified", "publishedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()) RETURNING id`,
        [ownerId, categoryId, locationId, item.title, item.slug, item.description, item.price, item.currency, item.purpose, item.status, item.coverImageUrl, item.isFeatured, item.isVerified]
      );
      listingId = inserted[0].id;

      // Insert Listing Images
      let order = 0;
      for (const imgUrl of item.images) {
        await queryNeon(
          `INSERT INTO "listing_images" ("listingId", "imageUrl", "displayOrder", "isCover") VALUES ($1, $2, $3, $4)`,
          [listingId, imgUrl, order, order === 0]
        );
        order++;
      }
      console.log(`  [+] Inserted Listing: ${item.title}`);
    }

    // Insert Sample Contact Requests & Visit Requests for Grace (Buyer)
    if (item.slug === 'luxury-4-bedroom-villa-kibagabaga-kigali') {
      const buyerId = userMap['grace.buyer@baza.rw'];
      const ownerId = userMap[item.ownerEmail];

      // Contact Request
      await queryNeon(
        `INSERT INTO "contact_requests" ("listingId", "senderId", "receiverId", "name", "phoneNumber", "email", "message", "status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
        [listingId, buyerId, ownerId, 'Grace Uwase', '+250785112233', 'grace.buyer@baza.rw', 'Hello, I am interested in viewing this villa. Is the price negotiable?']
      );

      // Visit Request
      await queryNeon(
        `INSERT INTO "visit_requests" ("listingId", "requesterId", "sellerId", "preferredDate", "preferredTime", "message", "status")
         VALUES ($1, $2, $3, '2026-09-05', '14:00', 'Requesting an in-person walkthrough of the property with my architect.', 'PENDING')`,
        [listingId, buyerId, ownerId]
      );

      // Saved Listing
      await queryNeon(
        `INSERT INTO "saved_listings" ("userId", "listingId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [buyerId, listingId]
      );
    }
  }

  // 9. Seed System Notifications
  const graceId = userMap['grace.buyer@baza.rw'];
  if (graceId) {
    await queryNeon(
      `INSERT INTO "notifications" ("userId", "title", "message", "type", "isRead") VALUES
       ($1, 'Welcome to BAZA Marketplace', 'Find and list houses, land plots, and vehicles across Rwanda.', 'SYSTEM', true),
       ($1, 'Visit Request Submitted', 'Your visit request for Luxury Villa Kibagabaga is pending review.', 'VISIT_REQUEST', false)`,
      [graceId]
    );
  }

  console.log('🎉 Successfully finished seeding Neon PostgreSQL database with rich demo data!');
}

runSeed().catch(err => {
  console.error('❌ Seeding Neon failed:', err);
  process.exit(1);
});
