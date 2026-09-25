import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1722870000000 implements MigrationInterface {
  name = 'InitialSchema1722870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Enums
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_requests_verificationtype_enum" AS ENUM('SELLER', 'BROKER', 'DEALER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_requests_status_enum" AS ENUM('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listings_purpose_enum" AS ENUM('SALE', 'RENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listings_status_enum" AS ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'SOLD', 'RENTED', 'SUSPENDED', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."visit_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED', 'REJECTED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')`,
    );

    // Create Tables
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(50) NOT NULL,
        "description" character varying(255),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
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
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_phoneNumber" ON "users" ("phoneNumber");`);

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "verification_requests" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
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
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_categories_slug" ON "categories" ("slug");`);

    await queryRunner.query(`
      CREATE TABLE "locations" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "listings" (
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
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_listings_slug" ON "listings" ("slug");`);
    await queryRunner.query(`CREATE INDEX "IDX_listings_status" ON "listings" ("status");`);
    await queryRunner.query(`CREATE INDEX "IDX_listings_purpose" ON "listings" ("purpose");`);
    await queryRunner.query(`CREATE INDEX "IDX_listings_price" ON "listings" ("price");`);
    await queryRunner.query(`CREATE INDEX "IDX_listings_publishedAt" ON "listings" ("publishedAt");`);

    await queryRunner.query(`
      CREATE TABLE "listing_images" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "saved_listings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "listingId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_saved_listings_user_listing" UNIQUE ("userId", "listingId"),
        CONSTRAINT "PK_saved_listings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_listings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_saved_listings_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_saved_listings_user" ON "saved_listings" ("userId");`);
    await queryRunner.query(`CREATE INDEX "IDX_saved_listings_user_listing" ON "saved_listings" ("userId", "listingId");`);

    await queryRunner.query(`
      CREATE TABLE "contact_requests" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "visit_requests" (
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
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
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
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user" ON "notifications" ("userId");`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_isRead" ON "notifications" ("userId", "isRead");`);

    await queryRunner.query(`
      CREATE TABLE "reports" (
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
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "visit_requests"`);
    await queryRunner.query(`DROP TABLE "contact_requests"`);
    await queryRunner.query(`DROP TABLE "saved_listings"`);
    await queryRunner.query(`DROP TABLE "listing_images"`);
    await queryRunner.query(`DROP TABLE "listings"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "verification_requests"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);

    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."visit_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."listings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."listings_purpose_enum"`);
    await queryRunner.query(`DROP TYPE "public"."verification_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."verification_requests_verificationtype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
  }
}
