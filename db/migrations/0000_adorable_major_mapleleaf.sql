CREATE SCHEMA "contact";
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "med";
--> statement-breakpoint
CREATE TABLE "contact"."subscriber_access_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subscriber_id" bigint,
	"actor_service" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact"."subscribers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subscriber_token" uuid NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_subscriber_token_unique" UNIQUE("subscriber_token")
);
--> statement-breakpoint
CREATE TABLE "contact"."waitlist_signups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"zip" text NOT NULL,
	"source" text DEFAULT 'onboarding_step2' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "core"."activations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"fee_cents" integer NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."availability" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doctor_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_min" smallint NOT NULL,
	"end_min" smallint NOT NULL,
	CONSTRAINT "availability_dow_chk" CHECK ("core"."availability"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "availability_minutes_chk" CHECK ("core"."availability"."start_min" BETWEEN 0 AND 1440 AND "core"."availability"."end_min" BETWEEN 0 AND 1440 AND "core"."availability"."end_min" > "core"."availability"."start_min")
);
--> statement-breakpoint
CREATE TABLE "core"."clinic_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"clinic_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_users_role_chk" CHECK ("core"."clinic_users"."role" IN ('owner','editor'))
);
--> statement-breakpoint
CREATE TABLE "core"."clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"website" text,
	"year_opened" smallint,
	"status" text DEFAULT 'pending' NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"tagline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clinics_status_chk" CHECK ("core"."clinics"."status" IN ('pending','approved','paused','retired'))
);
--> statement-breakpoint
CREATE TABLE "core"."doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"credentials" text,
	"specialty_id" bigint NOT NULL,
	"bio" text,
	"philosophy" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"panel_current" integer DEFAULT 0 NOT NULL,
	"panel_cap" integer,
	"accepting" boolean DEFAULT true NOT NULL,
	"price_adult_cents" integer,
	"price_couple_cents" integer,
	"price_child_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "core"."reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doctor_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"body" text,
	"display_attribution" text DEFAULT 'Verified patient' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_chk" CHECK ("core"."reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "core"."session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."specialties" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "specialties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "core"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"subscriber_token" uuid NOT NULL,
	"billing_path" text DEFAULT 'rm_billed' NOT NULL,
	"plan" text DEFAULT 'adult' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "subscriptions_subscriber_token_unique" UNIQUE("subscriber_token"),
	CONSTRAINT "subscriptions_billing_path_chk" CHECK ("core"."subscriptions"."billing_path" IN ('rm_billed','clinic_direct')),
	CONSTRAINT "subscriptions_status_chk" CHECK ("core"."subscriptions"."status" IN ('trialing','active','past_due','canceled','refunded'))
);
--> statement-breakpoint
CREATE TABLE "core"."user" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "core"."verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "med"."intake_responses" (
	"intake_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zip" text NOT NULL,
	"age_band" text NOT NULL,
	"household_size" smallint DEFAULT 1 NOT NULL,
	"needs" text[] DEFAULT '{}'::text[] NOT NULL,
	"insurance_posture" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact"."subscriber_access_log" ADD CONSTRAINT "subscriber_access_log_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "contact"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "core"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."activations" ADD CONSTRAINT "activations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "core"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."availability" ADD CONSTRAINT "availability_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "core"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."clinic_users" ADD CONSTRAINT "clinic_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."clinic_users" ADD CONSTRAINT "clinic_users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "core"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."doctors" ADD CONSTRAINT "doctors_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "core"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."doctors" ADD CONSTRAINT "doctors_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "core"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."reviews" ADD CONSTRAINT "reviews_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "core"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "core"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."subscriptions" ADD CONSTRAINT "subscriptions_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "core"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriber_access_log_subscriber_idx" ON "contact"."subscriber_access_log" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "subscriber_access_log_created_idx" ON "contact"."subscriber_access_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_email_ci_uq" ON "contact"."subscribers" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_ci_uq" ON "contact"."waitlist_signups" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "activations_subscription_idx" ON "core"."activations" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "availability_doctor_day_idx" ON "core"."availability" USING btree ("doctor_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_users_user_clinic_uq" ON "core"."clinic_users" USING btree ("user_id","clinic_id");--> statement-breakpoint
CREATE INDEX "doctors_clinic_idx" ON "core"."doctors" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "doctors_specialty_idx" ON "core"."doctors" USING btree ("specialty_id");--> statement-breakpoint
CREATE INDEX "reviews_doctor_idx" ON "core"."reviews" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "subscriptions_doctor_idx" ON "core"."subscriptions" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "intake_responses_zip_idx" ON "med"."intake_responses" USING btree ("zip");--> statement-breakpoint
CREATE INDEX "intake_responses_created_idx" ON "med"."intake_responses" USING btree ("created_at");