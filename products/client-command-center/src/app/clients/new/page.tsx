import { createClientAction } from "@/app/actions";
import { Button, Field, Flash, Select } from "@/components/ui";
import { myMemberships } from "@/lib/data";
import { canOperate } from "@/lib/labels";

export default async function NewClientPage({ searchParams }: PageProps<"/clients/new">) {
  const sp = await searchParams;
  const orgs = (await myMemberships()).filter((m) => canOperate(m.role));
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">New client</h1>
      <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      {orgs.length === 0 ? (
        <p className="text-sm">You need an owner, admin or CSM role to add clients.</p>
      ) : (
        <form action={createClientAction} className="flex flex-col gap-3">
          <Select label="Organization" name="org" required options={orgs.map((o) => [o.orgId, o.orgName] as const)} />
          <Field label="Client name" name="name" required />
          <Field label="Business / company" name="business" />
          <Field label="Primary email" name="email" type="email" />
          <Field label="Timezone (IANA)" name="timezone" placeholder="America/New_York" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="internal_test" defaultChecked />
            Internal test client (fictional data only)
          </label>
          <p className="text-xs text-slate-600">
            New clients start at <strong>Payment pending</strong>. Fulfillment cannot start until an owner or admin records a signed contract.
          </p>
          <Button>Create client</Button>
        </form>
      )}
    </div>
  );
}
