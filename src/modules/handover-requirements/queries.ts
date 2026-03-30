import { db } from "@/db";

export async function listHandoverItems() {
  return db.query.handoverRequirements.findMany({
    orderBy: (r, { asc }) => asc(r.name),
  });
}

/** Lean shape for New Sale's checklist. */
export async function listActiveHandoverItems() {
  return db.query.handoverRequirements.findMany({
    where: (r, { eq }) => eq(r.isActive, true),
    orderBy: (r, { asc }) => asc(r.name),
    columns: { id: true, name: true },
  });
}
