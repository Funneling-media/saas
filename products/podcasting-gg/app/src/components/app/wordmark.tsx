import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium tracking-tight", className)}>
      <span
        aria-hidden
        className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
          <rect x="7" y="2" width="2" height="8" rx="1" />
          <path d="M4 8a4 4 0 0 0 8 0h1.5a5.5 5.5 0 0 1-4.75 5.45V15h-1.5v-1.55A5.5 5.5 0 0 1 2.5 8H4Z" />
        </svg>
      </span>
      {!compact && (
        <span>
          Podcasting<span className="text-muted-foreground">.gg</span>
        </span>
      )}
    </span>
  );
}
