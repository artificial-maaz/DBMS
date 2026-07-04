CREATE TYPE "public"."job_status" AS ENUM('open', 'in_progress', 'completed', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."warranty_status" AS ENUM('free_coupon', 'in_warranty', 'out_of_warranty');--> statement-breakpoint
CREATE TABLE "job_card_parts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_card_parts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_card_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_cards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_cards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_no" varchar(30) NOT NULL,
	"branch_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"vehicle_id" integer,
	"chassis_no" varchar(50) NOT NULL,
	"odometer_km" integer,
	"complaints" text NOT NULL,
	"mechanic_id" text,
	"warranty_status" "warranty_status" DEFAULT 'out_of_warranty' NOT NULL,
	"coupon_no" integer,
	"labor_charge" numeric(12, 2) DEFAULT '0' NOT NULL,
	"parts_charge" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"work_notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"delivered_at" timestamp,
	CONSTRAINT "job_cards_job_no_unique" UNIQUE("job_no")
);
--> statement-breakpoint
ALTER TABLE "job_card_parts" ADD CONSTRAINT "job_card_parts_job_card_id_job_cards_id_fk" FOREIGN KEY ("job_card_id") REFERENCES "public"."job_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_card_parts" ADD CONSTRAINT "job_card_parts_part_id_spare_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."spare_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;