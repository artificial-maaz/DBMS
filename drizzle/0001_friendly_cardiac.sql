CREATE TYPE "public"."part_movement_reason" AS ENUM('initial', 'restock', 'sale', 'workshop', 'adjustment');--> statement-breakpoint
CREATE TABLE "part_movements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "part_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"part_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" "part_movement_reason" NOT NULL,
	"note" text,
	"invoice_id" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spare_parts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "spare_parts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"part_no" varchar(60),
	"sku" varchar(60),
	"branch_id" integer NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"cost_price" numeric(12, 2),
	"retail_price" numeric(12, 2),
	"low_stock_at" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_part_id_spare_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."spare_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;