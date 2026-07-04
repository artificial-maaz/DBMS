import { redirect } from "next/navigation";
import { getSessionWithProfile } from "@/lib/session";

export default async function Home() {
  const s = await getSessionWithProfile();
  redirect(s?.profile?.isActive ? "/dashboard" : "/login");
}
