import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import MasterDashboard from "@/components/MasterDashboard";

export default async function MasterPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "MASTER") redirect("/dashboard");

  return (
    <AppShell user={session}>
      <MasterDashboard />
    </AppShell>
  );
}
