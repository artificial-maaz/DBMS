"use server";

import { revalidatePath } from "next/cache";
import { createTestDrive, setTestDriveStatus } from "@/modules/testdrives/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role, branchId: profile.branchId };
};

export async function bookTestDriveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await createTestDrive(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/test-drives");
  return { ok: true };
}

export async function setStatusAction(id: number, to: string): Promise<ActionState> {
  const result = await setTestDriveStatus(await actor(), id, to);
  revalidatePath("/test-drives");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
