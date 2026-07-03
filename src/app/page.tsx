import { redirect } from "next/navigation";

/** Root: everything lives behind auth. Dashboard arrives in a later chunk. */
export default function Home() {
  redirect("/login");
}
