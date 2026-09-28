import Link from "next/link";
import { Badge, Flash } from "@/components/ui";
import { listClients, myMemberships } from "@/lib/data";
import { STAGE_LABELS, canOperate } from "@/lib/labels";
import type { AccountStage } from "@/lib/types";

const FILTERS: [string, string][] = [
  ["active", "Active desk"],
  ["onboarding", "Contracted / onboarding"],
  ["pre-contract", "Pre-contract"],
  ["inactive", "Inactive / finished"],
  ["all", "All"],
];

const MATCH: Record<string, (s: AccountStage) => boolean> = {
  active: (s) => s === "active",
  onboarding: (s) => s === "contract_signed" || s === "onboarding_booked",
  "pre-contract": (s) => s === "payment_pending" || s === "paid",
  inactive: (s) => s === "inactive" || s === "finished",
  all: () => true,
};

export default async function ClientsPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" && sp.view in MATCH ? sp.view : "active";
  const [clients, memberships] = await Promise.all([listClients(), myMemberships()]);
  const shown = clients.filter((c) => MATCH[view](c.account_stage));
  const mayCreate = memberships.some((m) => canOperate(m.role));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Clients</h1>
        {mayCreate && (
          <Link href="/clients/new" className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            New client
          </Link>
        )}
      </div>
      <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      {memberships.length === 0 && (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Your account has no organization membership yet. An owner must add you before any client is visible.
        </p>
      )}
      <nav aria-label="Filter clients" className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={`/?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`rounded border px-2 py-1 ${view === key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
          >
            {label} ({clients.filter((c) => MATCH[key](c.account_stage)).length})
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-600">No clients in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2">Client</th>
                <th scope="col" className="px-3 py-2">Stage</th>
                <th scope="col" className="px-3 py-2">Fulfillment</th>
                <th scope="col" className="px-3 py-2">Current package</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link href={`/clients/${c.id}`} className="font-medium text-blue-800 hover:underline">
                      {c.display_name}
                    </Link>
                    {c.business_name && <span className="text-slate-600"> · {c.business_name}</span>}{" "}
                    {c.is_internal_test && <Badge tone="info">Internal test</Badge>}
                  </td>
                  <td className="px-3 py-2">{STAGE_LABELS[c.account_stage]}</td>
                  <td className="px-3 py-2">
                    {c.packageCount === 0 ? <Badge>Not activated</Badge> : `${c.approvedCount} / ${c.packageCount} approved`}
                  </td>
                  <td className="px-3 py-2">{c.currentPackage ? `${c.currentPackage.title} (${c.currentPackage.status.replace("_", " ")})` : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
