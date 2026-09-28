import { Badge } from "@/components/ui";

// Truthful by construction: nothing here is derived from environment variables. A provider
// may only show "Connected" once an authenticated health check exists and passes.
const PROVIDERS: { name: string; purpose: string; status: string; next: string }[] = [
  { name: "Supabase (Postgres, Auth)", purpose: "System of record", status: "Built: fixture tested locally", next: "Apply migrations to a project; verify backups and restore" },
  { name: "Stripe", purpose: "Payment evidence (read-only)", status: "Not built", next: "Read-only reconciliation slice" },
  { name: "Whop", purpose: "Payment evidence (read-only)", status: "Not built", next: "Read-only reconciliation slice" },
  { name: "Commas / \"Commerce\"", purpose: "Payment evidence (read-only)", status: "Not built", next: "Confirm whether these are the same platform" },
  { name: "Google Sheets client list", purpose: "One-time roster import", status: "Not built", next: "Staged, human-reviewed import that cannot activate fulfillment" },
  { name: "Wispr Flow", purpose: "Meeting memory", status: "Not built", next: "Candidate matching with human confirmation" },
  { name: "Fathom", purpose: "Meeting memory", status: "Not built", next: "Signed webhook with replay protection" },
  { name: "Google Drive", purpose: "Client folders", status: "Not built", next: "Idempotent folder provisioning" },
  { name: "GoHighLevel", purpose: "Onboarding, CRM, funnels", status: "Not built", next: "Onboarding invite + completion callback" },
  { name: "Slack", purpose: "Accountability channel", status: "Not built", next: "Draft-for-approval text reminders" },
  { name: "WhatsApp", purpose: "Reminder channel", status: "Not built", next: "Blocked on opt-in records and approved templates" },
  { name: "HeyGen", purpose: "Personalized video", status: "Not built", next: "Blocked on approved avatar/voice consent" },
  { name: "Kimi / Canva / media tools", purpose: "Asset production", status: "Not built", next: "Manual upload first; cost approval before any paid job" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Integrations</h1>
      <p className="text-sm text-slate-700">
        No external provider is connected. This app sends no messages, starts no paid jobs, and changes nothing outside its own database.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2">Provider</th>
              <th scope="col" className="px-3 py-2">Purpose</th>
              <th scope="col" className="px-3 py-2">Status</th>
              <th scope="col" className="px-3 py-2">Next step</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p) => (
              <tr key={p.name} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.purpose}</td>
                <td className="px-3 py-2">
                  <Badge tone={p.status.startsWith("Built") ? "info" : "neutral"}>{p.status}</Badge>
                </td>
                <td className="px-3 py-2">{p.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
