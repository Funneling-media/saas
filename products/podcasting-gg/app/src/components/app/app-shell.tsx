"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildNav } from "@/components/app/nav";
import { Wordmark } from "@/components/app/wordmark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommandPalette } from "@/components/app/command-palette";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { UserMenu } from "@/components/app/user-menu";
import type { Membership } from "@/db/organizations";

export type ShellProps = {
  base: string; // e.g. /acme/acme
  organization: { name: string; slug: string };
  workspace: { name: string; slug: string };
  memberships: Membership[];
  user: { email: string; fullName: string | null };
  children: ReactNode;
};

export function AppShell({
  base,
  organization,
  workspace,
  memberships,
  user,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <SidebarNav base={base} onNavigate={() => setMobileOpen(false)}>
      <WorkspaceSwitcher current={{ organization, workspace }} memberships={memberships} />
    </SidebarNav>
  );

  return (
    <div className="flex min-h-svh">
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r md:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 flex h-12 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="md:hidden">
            <Wordmark compact />
          </div>
          <div className="flex-1" />
          <CommandPalette base={base} />
          <UserMenu user={user} />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({
  base,
  children,
  onNavigate,
}: {
  base: string;
  children: ReactNode;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const groups = buildNav();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b px-4">
        <Link href={base} className="flex items-center" onClick={onNavigate}>
          <Wordmark />
        </Link>
      </div>
      <div className="border-b p-2">{children}</div>
      <ScrollArea className="flex-1">
        <nav aria-label="Primary" className="space-y-4 p-2">
          {groups.map((group, gi) => (
            <div key={group.label ?? gi}>
              {group.label && (
                <p className="text-muted-foreground px-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const active = item.href === "" ? pathname === base : pathname.startsWith(href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "text-foreground/80 hover:bg-accent/60 hover:text-foreground flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                          active && "bg-accent text-accent-foreground font-medium",
                        )}
                      >
                        <item.icon className="size-4 shrink-0 opacity-80" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
