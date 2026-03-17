import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppShell from "@/components/AppShell";
import BAccountDetail from "@/components/BAccountDetail";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function BAccountDetailPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "MASTER") redirect("/dashboard");

  const { id } = await params;
  const { date } = await searchParams;

  return (
    <AppShell user={session}>
      <BAccountDetail bAccountId={id} initialDate={date} />
    </AppShell>
  );
}
