import type { LucideIcon } from "lucide-react";
import {
  Home,
  Mic,
  Users,
  Radio,
  Brain,
  Sparkles,
  CheckSquare,
  Inbox,
  Library,
  Send,
  BarChart3,
  Settings,
  Plug,
  Palette,
  Compass,
  UserRound,
  Search,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; hint?: string };
export type NavGroup = { label?: string; items: NavItem[] };

/** Grouped navigation. `href` is relative to the workspace root. */
export function buildNav(): NavGroup[] {
  return [
    {
      items: [
        { label: "Mission Control", href: "", icon: Home, hint: "What to do today" },
        { label: "Tasks", href: "/tasks", icon: CheckSquare },
        { label: "Approvals", href: "/approvals", icon: Inbox },
      ],
    },
    {
      label: "Host mode",
      items: [
        { label: "Podcast & strategy", href: "/podcast", icon: Compass },
        { label: "Guests", href: "/guests", icon: Users, hint: "Pipeline & research" },
        { label: "Episodes", href: "/episodes", icon: Mic },
        { label: "Publishing", href: "/publishing", icon: Radio },
      ],
    },
    {
      label: "Guest mode",
      items: [
        { label: "Your guest profile", href: "/guest-mode", icon: UserRound },
        { label: "Target podcasts", href: "/guest-mode/podcasts", icon: Send },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "Relationships", href: "/relationships", icon: Users },
        { label: "Opportunities", href: "/opportunities", icon: Sparkles },
        { label: "Podcast Brain", href: "/brain", icon: Brain },
        { label: "Content Library", href: "/content", icon: Library },
        { label: "Analytics", href: "/analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Brand Kit", href: "/brand", icon: Palette },
        { label: "Integrations", href: "/integrations", icon: Plug },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];
}

export const searchIcon = Search;
