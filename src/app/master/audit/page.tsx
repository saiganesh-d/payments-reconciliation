import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import AuditLog from "@/components/AuditLog";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "MASTER") redirect("/dashboard");

  return (
    <AppShell user={session}>
      <AuditLog />
    </AppShell>
  );
}
