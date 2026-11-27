import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  // Logged-in users go straight to the dashboard; everyone else sees the marketing page
  redirect(session?.user ? "/dashboard" : "/home");
}
