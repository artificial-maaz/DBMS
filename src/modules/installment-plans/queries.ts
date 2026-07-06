import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { installmentPlans } from "@/db/schema";

export async function listPlans() {
  return db.query.installmentPlans.findMany({
    orderBy: (p, { asc }) => [asc(p.company), asc(p.model)],
  });
}

export async function listActivePlans() {
  return db.query.installmentPlans.findMany({
    where: (p, { eq }) => eq(p.isActive, true),
    orderBy: (p, { asc }) => [asc(p.company), asc(p.model)],
  });
}

/** Lean shape for New Sale's auto-fill matching (make+model → company+model). */
export async function listActivePlansForSale() {
  return db
    .select({
      id: installmentPlans.id,
      company: installmentPlans.company,
      model: installmentPlans.model,
      cashPrice: installmentPlans.cashPrice,
      advance: installmentPlans.advance,
      monthly3: installmentPlans.monthly3,
      total3: installmentPlans.total3,
      monthly6: installmentPlans.monthly6,
      total6: installmentPlans.total6,
      monthly9: installmentPlans.monthly9,
      total9: installmentPlans.total9,
      monthly12: installmentPlans.monthly12,
      total12: installmentPlans.total12,
    })
    .from(installmentPlans)
    .where(eq(installmentPlans.isActive, true))
    .orderBy(asc(installmentPlans.company), asc(installmentPlans.model));
}
