CREATE TABLE "payroll_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payroll_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pay_no" varchar(30) NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" integer,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"allowances" numeric(12, 2) DEFAULT '0' NOT NULL,
	"commissions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_payout" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_records_pay_no_unique" UNIQUE("pay_no")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchase_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"po_no" varchar(30) NOT NULL,
	"supplier_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"description" text NOT NULL,
	"total_cost" numeric(14, 2) NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"purchase_date" date NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_no_unique" UNIQUE("po_no")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suppliers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"contact_person" varchar(120),
	"phone" varchar(20),
	"email" varchar(120),
	"city" varchar(60),
	"ntn" varchar(30),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "basic_salary" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "monthly_allowances" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;