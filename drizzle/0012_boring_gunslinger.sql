CREATE TYPE "public"."test_drive_status" AS ENUM('scheduled', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TABLE "test_drives" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "test_drives_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer,
	"visitor_id" integer,
	"person_name" varchar(120) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"vehicle_id" integer,
	"vehicle_text" varchar(120),
	"branch_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" "test_drive_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_drives" ADD CONSTRAINT "test_drives_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_drives" ADD CONSTRAINT "test_drives_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_drives" ADD CONSTRAINT "test_drives_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_drives" ADD CONSTRAINT "test_drives_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;