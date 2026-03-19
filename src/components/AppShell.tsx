"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Shield, Menu, X, Settings, FileText, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    bAccountId?: string | null;
  };
}

export default function AppShell({ children, user }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isMaster = user.role === "MASTER";

  const navLinks = isMaster
    ? [
        { href: "/master", label: "Dashboard", icon: Home },
        { href: "/master/manage", label: "Manage", icon: Settings },
        { href: "/master/audit", label: "Audit Log", icon: FileText },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard/manage", label: "Manage Groups", icon: Settings },
      ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <Link href={isMaster ? "/master" : "/dashboard"} className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-tight leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                71<span className="text-accent">bay</span>
              </h1>
            </Link>
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: User info + logout */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
              {isMaster ? (
                <Shield className="w-3.5 h-3.5 text-accent" />
              ) : (
                <LayoutDashboard className="w-3.5 h-3.5 text-accent" />
              )}
              <span className="text-xs font-medium">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-muted hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden border-t border-border overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-muted hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex items-center gap-2 px-3 py-2">
                    {isMaster ? (
                      <Shield className="w-4 h-4 text-accent" />
                    ) : (
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                    )}
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted px-2 py-0.5 rounded bg-surface">
                      {isMaster ? "Master" : user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-danger hover:text-danger/80 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
