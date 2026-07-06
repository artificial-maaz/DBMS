CREATE TABLE "installment_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "installment_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company" varchar(60) NOT NULL,
	"model" varchar(100) NOT NULL,
	"cash_price" numeric(12, 2) NOT NULL,
	"advance" numeric(12, 2) NOT NULL,
	"monthly_3" numeric(12, 2) NOT NULL,
	"total_3" numeric(12, 2) NOT NULL,
	"monthly_6" numeric(12, 2) NOT NULL,
	"total_6" numeric(12, 2) NOT NULL,
	"monthly_9" numeric(12, 2) NOT NULL,
	"total_9" numeric(12, 2) NOT NULL,
	"monthly_12" numeric(12, 2) NOT NULL,
	"total_12" numeric(12, 2) NOT NULL,
	"effective_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "installment_plans_company_model_idx" ON "installment_plans" USING btree ("company","model");