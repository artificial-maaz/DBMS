CREATE TABLE "handover_requirements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "handover_requirements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "handover_requirements_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "invoice_handovers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoice_handovers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_id" integer NOT NULL,
	"requirement_id" integer NOT NULL,
	"requirement_name" varchar(120) NOT NULL,
	"handed_over" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_handovers" ADD CONSTRAINT "invoice_handovers_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_handovers" ADD CONSTRAINT "invoice_handovers_requirement_id_handover_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."handover_requirements"("id") ON DELETE no action ON UPDATE no action;