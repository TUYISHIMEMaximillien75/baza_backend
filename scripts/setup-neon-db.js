const https = require('https');

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_oRLI0Gc5XZwe@ep-blue-haze-ay3vbkph-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const HOSTNAME = 'ep-blue-haze-ay3vbkph-pooler.c-5.us-east-2.aws.neon.tech';

function queryNeon(sqlQuery, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sqlQuery, params });
    const req = https.request(
      {
        hostname: HOSTNAME,
        port: 443,
        family: 4,
        path: '/sql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Neon-Connection-String': NEON_CONN_STRING,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 400 || json.message) {
              reject(json);
            } else {
              resolve(json.rows || []);
            }
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function setupAndSeed() {
  console.log('🚀 Connecting to Neon PostgreSQL & setting up BAZA Marketplace Database...');

  // 1. Create Enums if not exists
  console.log('📋 Creating Enums...');
  const enums = [
    `DO $$ BEGIN CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."verification_requests_verificationtype_enum" AS ENUM('SELLER', 'BROKER', 'DEALER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."verification_requests_status_enum" AS ENUM('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."listings_purpose_enum" AS ENUM('SALE', 'RENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."listings_status_enum" AS ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'SOLD', 'RENTED', 'SUSPENDED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."visit_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED', 'REJECTED', 'CANCELLED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  ];
  for (const sql of enums) {
    await queryNeon(sql);
  }

  // 2. Create Tables
  console.log('🏗️ Creating Tables...');
  const tables = [
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
    );`,
  ];

  for (const sql of tables) {
    await queryNeon(sql);
  }

  // 3. Seed Roles
  console.log('🌱 Seeding Roles...');
  const roles = [
    ['USER', 'Standard platform buyer/renter user'],
    ['SELLER', 'Individual seller or landlord'],
    ['BROKER', 'Licensed property broker'],
    ['DEALER', 'Commercial vehicle dealership'],
    ['ADMIN', 'Platform moderator and administrator'],
    ['SUPER_ADMIN', 'Full system administrator'],
  ];
  for (const [name, desc] of roles) {
    await queryNeon(
      `INSERT INTO "roles" ("name", "description") VALUES ($1, $2) ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";`,
      [name, desc],
    );
  }

  // 4. Seed Categories & Subcategories
  console.log('🌱 Seeding Categories...');
  const parentCats = [
    ['Property', 'property', 'Houses, apartments, and commercial spaces for sale or rent', 'building'],
    ['Land', 'land', 'Residential, agricultural, and commercial plots', 'map-pin'],
    ['Vehicle', 'vehicle', 'Cars, SUVs, trucks, and motorcycles for sale or lease', 'car'],
  ];
  for (const [name, slug, desc, icon] of parentCats) {
    await queryNeon(
      `INSERT INTO "categories" ("name", "slug", "description", "icon") VALUES ($1, $2, $3, $4) ON CONFLICT ("slug") DO NOTHING;`,
      [name, slug, desc, icon],
    );
  }

  const propCat = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'property';`))[0]?.id;
  const landCat = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'land';`))[0]?.id;
  const vehCat = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'vehicle';`))[0]?.id;

  const subCats = [
    ['Houses', 'houses', 'Single family homes, luxury villas, and townhouses', 'home', propCat],
    ['Apartments', 'apartments', 'Modern apartments, penthouses, and studio flats', 'layers', propCat],
    ['Commercial', 'commercial', 'Office spaces, retail shops, showrooms, and warehouses', 'briefcase', propCat],
    ['Residential Land', 'residential-land', 'Zoned residential plots ready for building', 'map', landCat],
    ['Agricultural Land', 'agricultural-land', 'Farming and fertile agricultural land plots', 'sun', landCat],
    ['Sedans & Hatchbacks', 'sedans', 'Compact, executive, and luxury passenger cars', 'car', vehCat],
    ['SUVs & 4x4', 'suvs', 'All-terrain crossover and SUV vehicles', 'shield', vehCat],
    ['Trucks & Commercial', 'trucks', 'Light trucks, delivery vans, and haulers', 'truck', vehCat],
  ];
  for (const [name, slug, desc, icon, parentId] of subCats) {
    await queryNeon(
      `INSERT INTO "categories" ("name", "slug", "description", "icon", "parentId") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("slug") DO NOTHING;`,
      [name, slug, desc, icon, parentId],
    );
  }

  // 5. Seed Locations
  console.log('🌱 Seeding Locations...');
  const locationsData = [
    ['Kigali City', 'Gasabo', 'Remera', 'Rukiri II', 'Amahoro', -1.9566, 30.1084],
    ['Kigali City', 'Gasabo', 'Kimironko', 'Kibagabaga', 'Nyagatovu', -1.94, 30.125],
    ['Kigali City', 'Gasabo', 'Kacyiru', 'Kimatironko', 'Kagugu', -1.925, 30.0833],
    ['Kigali City', 'Kicukiro', 'Kanombe', 'Kabeza', 'Karama', -1.968, 30.142],
    ['Kigali City', 'Kicukiro', 'Niboye', 'Gatare', 'Niboye', -1.975, 30.1],
    ['Kigali City', 'Nyarugenge', 'Nyamirambo', 'Rwezamenyo', 'Biryogo', -1.9711, 30.052],
    ['Kigali City', 'Nyarugenge', 'Gitega', 'Akabahizi', 'Kigarama', -1.955, 30.06],
    ['Northern Province', 'Musanze', 'Muhoza', 'Ruhengeri', 'Kigombe', -1.4989, 29.6339],
    ['Western Province', 'Rubavu', 'Gisenyi', 'Nyakiliba', 'Gisenyi', -1.7028, 29.2564],
    ['Southern Province', 'Huye', 'Ngoma', 'Matyazo', 'Butare', -2.5967, 29.7394],
  ];
  for (const [prov, dist, sec, cell, vil, lat, lng] of locationsData) {
    const check = await queryNeon(
      `SELECT id FROM "locations" WHERE "province" = $1 AND "district" = $2 AND "sector" = $3 AND "cell" = $4;`,
      [prov, dist, sec, cell],
    );
    if (!check.length) {
      await queryNeon(
        `INSERT INTO "locations" ("province", "district", "sector", "cell", "village", "latitude", "longitude") VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [prov, dist, sec, cell, vil, lat, lng],
      );
    }
  }

  // 6. Seed Demo Users & Profiles
  console.log('🌱 Seeding Demo Users & Profiles...');
  const passHash = '$2b$10$w8T0iK.vR8.t6P1uN4P2b.zN.2P7r8W3m1L0.Z7N5v2W1X0P8.'; // dev hashed password
  const demoUsers = [
    [
      'Jean-Paul',
      'Nshimiyimana',
      'jp.nshimiyimana@baza.rw',
      '+250788123456',
      passHash,
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      'ACTIVE',
      true,
      true,
      'Top-rated property broker in Kigali with 8+ years experience in prime residential and commercial real estate.',
      'Kigali City',
      'Gasabo',
      'Kacyiru',
    ],
    [
      'Marie-Claire',
      'Mukamana',
      'mc.mukamana@baza.rw',
      '+250788654321',
      passHash,
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      'ACTIVE',
      true,
      true,
      'Real estate developer & property owner specializing in high-end villas and luxury apartments in Kibagabaga & Rebero.',
      'Kigali City',
      'Gasabo',
      'Kimironko',
    ],
    [
      'Eric',
      'Habimana',
      'eric.habimana@baza.rw',
      '+250788987654',
      passHash,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'ACTIVE',
      true,
      true,
      'General Manager at Impala Motors Rwanda. Certified dealer for Japanese SUVs and German executive sedans.',
      'Kigali City',
      'Kicukiro',
      'Kanombe',
    ],
    [
      'Divine',
      'Uwineza',
      'divine.uwineza@baza.rw',
      '+250788112233',
      passHash,
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      'ACTIVE',
      true,
      true,
      'Tech consultant based in Kigali, actively looking for residential investment properties and personal vehicles.',
      'Kigali City',
      'Nyarugenge',
      'Nyamirambo',
    ],
    [
      'Admin',
      'Moderator',
      'admin@baza.rw',
      '+250788000000',
      passHash,
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      'ACTIVE',
      true,
      true,
      'Official BAZA Marketplace System Administrator and Content Moderator.',
      'Kigali City',
      'Gasabo',
      'Remera',
    ],
  ];

  const userMap = {};
  for (const [fn, ln, email, phone, phash, img, status, ev, pv, bio, prov, dist, sec] of demoUsers) {
    let userRow = (await queryNeon(`SELECT id FROM "users" WHERE "email" = $1;`, [email]))[0];
    if (!userRow) {
      userRow = (
        await queryNeon(
          `INSERT INTO "users" ("firstName", "lastName", "email", "phoneNumber", "passwordHash", "profileImageUrl", "status", "emailVerified", "phoneVerified", "lastLoginAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id;`,
          [fn, ln, email, phone, phash, img, status, ev, pv],
        )
      )[0];
      await queryNeon(
        `INSERT INTO "user_profiles" ("userId", "bio", "province", "district", "sector", "address") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT ("userId") DO NOTHING;`,
        [userRow.id, bio, prov, dist, sec, `${sec}, ${dist}`],
      );
    }
    userMap[email] = userRow.id;
  }

  // 7. Seed Verification Requests
  console.log('🌱 Seeding Verification Requests...');
  const verifications = [
    [userMap['jp.nshimiyimana@baza.rw'], 'BROKER', 'APPROVED'],
    [userMap['mc.mukamana@baza.rw'], 'SELLER', 'APPROVED'],
    [userMap['eric.habimana@baza.rw'], 'DEALER', 'APPROVED'],
  ];
  for (const [uid, vtype, vstatus] of verifications) {
    await queryNeon(
      `INSERT INTO "verification_requests" ("userId", "verificationType", "status", "submittedAt", "reviewedAt") VALUES ($1, $2, $3, NOW(), NOW());`,
      [uid, vtype, vstatus],
    );
  }

  // Fetch Category and Location IDs for Listings
  const housesCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'houses';`))[0]?.id;
  const aptsCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'apartments';`))[0]?.id;
  const commCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'commercial';`))[0]?.id;
  const resLandCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'residential-land';`))[0]?.id;
  const agriLandCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'agricultural-land';`))[0]?.id;
  const sedansCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'sedans';`))[0]?.id;
  const suvsCatId = (await queryNeon(`SELECT id FROM "categories" WHERE "slug" = 'suvs';`))[0]?.id;

  const locKimironko = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Kimironko';`))[0]?.id;
  const locKacyiru = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Kacyiru';`))[0]?.id;
  const locRemera = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Remera';`))[0]?.id;
  const locKanombe = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Kanombe';`))[0]?.id;
  const locNiboye = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Niboye';`))[0]?.id;
  const locMusanze = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Muhoza';`))[0]?.id;
  const locGisenyi = (await queryNeon(`SELECT id FROM "locations" WHERE "sector" = 'Gisenyi';`))[0]?.id;

  // 8. Seed High Quality Demo Listings
  console.log('🏡 Seeding Demo Marketplace Listings...');
  const demoListings = [
    {
      ownerId: userMap['mc.mukamana@baza.rw'],
      categoryId: housesCatId,
      locationId: locKimironko,
      title: 'Modern 4-Bedroom Villa with Swimming Pool in Kibagabaga',
      slug: 'modern-4-bedroom-villa-kibagabaga',
      description:
        'Stunning contemporary 4-bedroom villa featuring a private swimming pool, landscaped tropical garden, executive master suite with balcony views of Kigali City, modern fitting kitchen, boys quarters, and parking for 4 vehicles.',
      price: 185000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      isFeatured: true,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'Villa Exterior', 1, true],
        ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'Living Room', 2, false],
        ['https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800', 'Master Bedroom', 3, false],
      ],
    },
    {
      ownerId: userMap['jp.nshimiyimana@baza.rw'],
      categoryId: aptsCatId,
      locationId: locKacyiru,
      title: 'Fully Furnished 2-Bedroom Apartment in Kacyiru near US Embassy',
      slug: 'furnished-2-bedroom-apartment-kacyiru',
      description:
        'Luxury 2-bedroom serviced apartment located in secure Kacyiru embassy district. Comes fully furnished with high-speed fiber internet, 24/7 security, standby generator, underground parking, and daily housekeeping services.',
      price: 750000,
      currency: 'RWF',
      purpose: 'RENT',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      isFeatured: true,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'Apartment Living Area', 1, true],
        ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'Modern Kitchen', 2, false],
      ],
    },
    {
      ownerId: userMap['jp.nshimiyimana@baza.rw'],
      categoryId: resLandCatId,
      locationId: locNiboye,
      title: 'Prime Residential Plot 800sqm in Rebero with Panoramic Views',
      slug: 'prime-residential-plot-800sqm-rebero',
      description:
        'Titled residential plot measuring 800 square meters located in prestigious Rebero area. Excellent topography with clear views of Kigali City skyline, direct access to tarmac road, electricity, and water infrastructure.',
      price: 45000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      isFeatured: false,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', 'Plot View', 1, true],
      ],
    },
    {
      ownerId: userMap['eric.habimana@baza.rw'],
      categoryId: suvsCatId,
      locationId: locKanombe,
      title: '2022 Toyota Land Cruiser Prado TX-L 2.8L Diesel (Low Mileage)',
      slug: '2022-toyota-land-cruiser-prado-txl',
      description:
        'Mint condition 2022 Toyota Land Cruiser Prado TX-L 7-seater SUV. 2.8L Turbo Diesel engine, automatic transmission, leather seats, sunroof, 360-degree camera, full agent service record at Toyota Rwanda. Only 24,000 km.',
      price: 78000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
      isFeatured: true,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 'Front View', 1, true],
        ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800', 'Interior Dash', 2, false],
      ],
    },
    {
      ownerId: userMap['jp.nshimiyimana@baza.rw'],
      categoryId: commCatId,
      locationId: locRemera,
      title: 'Spacious 350sqm Commercial Office Space in Remera Center',
      slug: 'spacious-350sqm-commercial-office-remera',
      description:
        'Open-plan commercial office floor measuring 350 sqm located right on Remera main road. Perfect for corporate headquarters, IT hub, or financial institution. Equipped with central AC, elevator, and ample basement parking.',
      price: 2800000,
      currency: 'RWF',
      purpose: 'RENT',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      isFeatured: false,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'Office Floor', 1, true],
      ],
    },
    {
      ownerId: userMap['mc.mukamana@baza.rw'],
      categoryId: agriLandCatId,
      locationId: locMusanze,
      title: 'Fertile Agricultural Land 2.5 Hectares in Musanze Foothills',
      slug: 'agricultural-land-2-5-hectares-musanze',
      description:
        'Extremely fertile agricultural land measuring 2.5 hectares located near Volcanoes National Park foothills in Musanze. Rich volcanic soil, perpetual river water source, perfect for potato, pyrethrum, or horticulture farming.',
      price: 28000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
      isFeatured: false,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800', 'Agricultural Field', 1, true],
      ],
    },
    {
      ownerId: userMap['eric.habimana@baza.rw'],
      categoryId: sedansCatId,
      locationId: locGisenyi,
      title: '2020 Mercedes-Benz C200 AMG Line (Full Options)',
      slug: '2020-mercedes-benz-c200-amg-line',
      description:
        'Sleek 2020 Mercedes-Benz C200 AMG Line sedan in obsidian black metallic. Burmester surround sound system, ambient lighting, panoramic glass roof, digital cockpit, immaculate interior condition.',
      price: 42000000,
      currency: 'RWF',
      purpose: 'SALE',
      status: 'PUBLISHED',
      coverImageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
      isFeatured: true,
      isVerified: true,
      images: [
        ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', 'Mercedes Exterior', 1, true],
      ],
    },
  ];

  const listingMap = {};
  for (const item of demoListings) {
    let listRow = (await queryNeon(`SELECT id FROM "listings" WHERE "slug" = $1;`, [item.slug]))[0];
    if (!listRow) {
      listRow = (
        await queryNeon(
          `INSERT INTO "listings" ("ownerId", "categoryId", "locationId", "title", "slug", "description", "price", "currency", "purpose", "status", "coverImageUrl", "isFeatured", "isVerified", "publishedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING id;`,
          [
            item.ownerId,
            item.categoryId,
            item.locationId,
            item.title,
            item.slug,
            item.description,
            item.price,
            item.currency,
            item.purpose,
            item.status,
            item.coverImageUrl,
            item.isFeatured,
            item.isVerified,
          ],
        )
      )[0];
    }
    listingMap[item.slug] = listRow.id;

    // Insert Images
    for (const [url, alt, order, isCover] of item.images) {
      await queryNeon(
        `INSERT INTO "listing_images" ("listingId", "imageUrl", "altText", "displayOrder", "isCover") VALUES ($1, $2, $3, $4, $5);`,
        [listRow.id, url, alt, order, isCover],
      );
    }
  }

  // 9. Seed Saved Listings, Contact & Visit Requests
  console.log('🌱 Seeding Interactions & Requests...');
  const divineId = userMap['divine.uwineza@baza.rw'];
  const villaId = listingMap['modern-4-bedroom-villa-kibagabaga'];
  const pradoId = listingMap['2022-toyota-land-cruiser-prado-txl'];
  const aptId = listingMap['furnished-2-bedroom-apartment-kacyiru'];

  if (divineId && villaId) {
    await queryNeon(
      `INSERT INTO "saved_listings" ("userId", "listingId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
      [divineId, villaId],
    );
    if (pradoId) {
      await queryNeon(
        `INSERT INTO "saved_listings" ("userId", "listingId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [divineId, pradoId],
      );
    }

    // Contact Request
    await queryNeon(
      `INSERT INTO "contact_requests" ("listingId", "senderId", "receiverId", "name", "phoneNumber", "email", "message", "status") VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        villaId,
        divineId,
        userMap['mc.mukamana@baza.rw'],
        'Divine Uwineza',
        '+250788112233',
        'divine.uwineza@baza.rw',
        'Hello Marie-Claire, I am interested in viewing the 4-bedroom villa in Kibagabaga this coming Saturday. Is the price negotiable for cash buyers?',
        'PENDING',
      ],
    );

    // Visit Request
    await queryNeon(
      `INSERT INTO "visit_requests" ("listingId", "requesterId", "sellerId", "preferredDate", "preferredTime", "message", "status") VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '3 days', '10:00 AM', 'Would like to arrange a site visit with my family and architect.', 'PENDING');`,
      [villaId, divineId, userMap['mc.mukamana@baza.rw']],
    );
  }

  // 10. Seed Notifications
  console.log('🌱 Seeding Notifications...');
  const notifications = [
    [
      userMap['jp.nshimiyimana@baza.rw'],
      'Verification Approved! 🎉',
      'Congratulations Jean-Paul! Your Broker verification request has been approved by BAZA Moderators. Your listings now bear the Verified Broker badge.',
      'VERIFICATION_APPROVED',
    ],
    [
      userMap['mc.mukamana@baza.rw'],
      'New Visit Request Received 📅',
      'Divine Uwineza requested a site visit for "Modern 4-Bedroom Villa with Swimming Pool in Kibagabaga".',
      'VISIT_REQUEST',
    ],
    [
      divineId,
      'Welcome to BAZA Marketplace Rwanda! 🇷🇼',
      'Explore verified houses, land plots, and vehicles across Rwanda. Save your favorite listings to get price drop alerts!',
      'WELCOME',
    ],
  ];

  for (const [uid, title, msg, type] of notifications) {
    if (uid) {
      await queryNeon(
        `INSERT INTO "notifications" ("userId", "title", "message", "type", "isRead") VALUES ($1, $2, $3, $4, false);`,
        [uid, title, msg, type],
      );
    }
  }

  console.log('✅ BAZA Marketplace Neon PostgreSQL Database setup and demo data seeding complete!');
}

setupAndSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to setup database on Neon:', err);
    process.exit(1);
  });
