CREATE TYPE "public"."visitor_source" AS ENUM('walk_in', 'event', 'referral', 'online');--> statement-breakpoint
CREATE TYPE "public"."visitor_status" AS ENUM('new', 'contacted', 'follow_up', 'converted', 'lost');--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visitors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"full_name" varchar(120) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"cnic" varchar(15),
	"interest" varchar(200),
	"budget" numeric(12, 2),
	"source" "visitor_source" DEFAULT 'walk_in' NOT NULL,
	"status" "visitor_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"follow_up_date" date,
	"branch_id" integer NOT NULL,
	"converted_customer_id" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;