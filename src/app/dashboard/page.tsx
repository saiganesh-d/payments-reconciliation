import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import BAccountDashboard from "@/components/BAccountDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "MASTER") redirect("/master");

  return (
    <AppShell user={session}>
      <BAccountDashboard bAccountId={session.bAccountId!} />
    </AppShell>
  );
}
