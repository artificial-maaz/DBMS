CREATE TABLE "purchase_order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"model" varchar(120) NOT NULL,
	"color" varchar(40),
	"qty_ordered" integer NOT NULL,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;