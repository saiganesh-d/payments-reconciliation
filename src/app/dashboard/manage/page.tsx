import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import ManageGroups from "@/components/ManageGroups";

export default async function ManageGroupsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "MASTER") redirect("/master");

  return (
    <AppShell user={session}>
      <ManageGroups bAccountId={session.bAccountId!} isMaster={false} />
    </AppShell>
  );
}
