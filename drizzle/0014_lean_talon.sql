CREATE TABLE "labor_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "labor_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"service_name" varchar(150) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"equipment" varchar(150),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "labor_rates_service_name_unique" UNIQUE("service_name")
);
