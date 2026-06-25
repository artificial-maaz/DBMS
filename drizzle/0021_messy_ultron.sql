CREATE TABLE "stock_deliveries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"delivery_no" varchar(30) NOT NULL,
	"branch_id" integer NOT NULL,
	"supplier_id" integer,
	"company_name" varchar(120),
	"challan_no" varchar(60),
	"batch_ref" varchar(60),
	"delivered_on" date NOT NULL,
	"transport_plate" varchar(20),
	"driver_name" varchar(120),
	"notes" text,
	"received_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_deliveries_delivery_no_unique" UNIQUE("delivery_no")
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "delivery_id" integer;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "arrived_on" date;--> statement-breakpoint
ALTER TABLE "stock_deliveries" ADD CONSTRAINT "stock_deliveries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_deliveries" ADD CONSTRAINT "stock_deliveries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;