CREATE TYPE "public"."gate_pass_status" AS ENUM('in_transit', 'received', 'cancelled');--> statement-breakpoint
CREATE TABLE "gate_passes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gate_passes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pass_no" varchar(30) NOT NULL,
	"vehicle_id" integer NOT NULL,
	"source_branch_id" integer NOT NULL,
	"dest_branch_id" integer NOT NULL,
	"driver_name" varchar(120) NOT NULL,
	"driver_phone" varchar(20),
	"transport_plate" varchar(20),
	"notes" text,
	"status" "gate_pass_status" DEFAULT 'in_transit' NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"received_by" text,
	"received_at" timestamp,
	"cancelled_by" text,
	"cancelled_at" timestamp,
	CONSTRAINT "gate_passes_pass_no_unique" UNIQUE("pass_no")
);
--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_source_branch_id_branches_id_fk" FOREIGN KEY ("source_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_dest_branch_id_branches_id_fk" FOREIGN KEY ("dest_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;