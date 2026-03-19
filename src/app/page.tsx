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
          
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            71<span className="text-accent">bay</span>
          </h1>
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
