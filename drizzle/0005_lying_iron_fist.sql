CREATE TYPE "public"."payment_method" AS ENUM('cash', 'online', 'bank_transfer', 'cheque');--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "payment_method" "payment_method" DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "cnic" varchar(15);