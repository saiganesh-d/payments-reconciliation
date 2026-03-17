import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function Home() {
  const session = await getSession();
  if (session) {
    if (session.role === "MASTER") redirect("/master");
    else redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Pay<span className="text-accent">Sync</span>
          </h1>
          <p className="text-muted mt-2 text-sm">Payment Consolidation Portal</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <LoginForm />
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
