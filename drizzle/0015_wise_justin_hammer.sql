CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_name" varchar(120) NOT NULL,
	"short_name" varchar(30) NOT NULL,
	"browser_title" varchar(120) NOT NULL,
	"theme_color" varchar(9) DEFAULT '#0f172a' NOT NULL,
	"logo_data_url" text,
	"default_commission_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"default_excise_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"default_showroom_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"warranty_days" integer DEFAULT 365 NOT NULL,
	"timezone" varchar(60) DEFAULT 'Asia/Karachi' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
