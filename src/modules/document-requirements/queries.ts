import { db } from "@/db";

export async function listRequirements() {
  return db.query.documentRequirements.findMany({
    orderBy: (r, { asc }) => asc(r.name),
  });
}

/** Lean shape for New Sale's checklist. */
export async function listActiveRequirements() {
  return db.query.documentRequirements.findMany({
    where: (r, { eq }) => eq(r.isActive, true),
    orderBy: (r, { asc }) => asc(r.name),
    columns: { id: true, name: true },
  });
}
