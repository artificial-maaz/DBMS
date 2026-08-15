ALTER TABLE "invoice_items" ADD COLUMN "part_id" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "qty" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_part_id_spare_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."spare_parts"("id") ON DELETE no action ON UPDATE no action;