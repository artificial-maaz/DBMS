CREATE TABLE "guarantors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guarantors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_id" integer NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"cnic" varchar(15) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;