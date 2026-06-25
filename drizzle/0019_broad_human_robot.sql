ALTER TYPE "public"."staff_role" ADD VALUE 'silent_partner' BEFORE 'branch_manager';--> statement-breakpoint
CREATE TABLE "branch_assets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "branch_assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"branch_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(60) DEFAULT 'other' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_value" numeric(12, 2) NOT NULL,
	"purchased_on" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_assets" ADD CONSTRAINT "branch_assets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;