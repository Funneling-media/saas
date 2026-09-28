"use client";

import Link from "next/link";
import { ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Membership } from "@/db/organizations";
import { initials } from "@/lib/utils";

type Props = {
  current: {
    organization: { name: string; slug: string };
    workspace: { name: string; slug: string };
  };
  memberships: Membership[];
};

export function WorkspaceSwitcher({ current, memberships }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-full justify-start gap-2 px-2">
          <span className="bg-foreground/90 text-background grid size-6 shrink-0 place-items-center rounded text-[11px] font-medium">
            {initials(current.workspace.name)}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-medium">{current.workspace.name}</span>
            <span className="text-muted-foreground block truncate text-[11px]">
              {current.organization.name}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {memberships.map((m) => (
          <div key={m.organization.id}>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {m.organization.name}
            </DropdownMenuLabel>
            {m.workspaces.map((w) => (
              <DropdownMenuItem key={w.id} asChild>
                <Link href={`/${m.organization.slug}/${w.slug}`}>{w.name}</Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <Plus className="size-4" /> New organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
