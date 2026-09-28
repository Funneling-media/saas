"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { buildNav } from "@/components/app/nav";

/**
 * ⌘K palette. Navigation now; global search results and actions plug in here
 * once the search service exists (Milestone 2/7).
 */
export function CommandPalette({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground h-8 gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="bg-muted hidden rounded border px-1 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Jump anywhere"
      >
        <CommandInput placeholder="Type a page, guest, episode…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          {buildNav().map((group, i) => (
            <div key={group.label ?? i}>
              <CommandGroup heading={group.label ?? "Home"}>
                {group.items.map((item) => (
                  <CommandItem key={item.href} onSelect={() => go(`${base}${item.href}`)}>
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </div>
          ))}
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => go(`${base}/guests/new`)}>Add a guest</CommandItem>
            <CommandItem onSelect={() => go(`${base}/episodes/new`)}>Create an episode</CommandItem>
            <CommandItem onSelect={() => go(`${base}/tasks?new=1`)}>New task</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
