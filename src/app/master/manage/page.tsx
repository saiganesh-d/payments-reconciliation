import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import MasterManage from "@/components/MasterManage";

export default async function MasterManagePage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "MASTER") redirect("/dashboard");

  return (
    <AppShell user={session}>
      <MasterManage />
    </AppShell>
  );
}
