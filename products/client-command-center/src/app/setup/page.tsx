export default function SetupPage() {
  return (
    <div className="max-w-2xl space-y-3 text-sm">
      <h1 className="text-xl font-semibold">Supabase is not configured</h1>
      <p>
        Status: <strong>Not configured</strong>. This app stores nothing in the browser. It needs a Supabase project with the
        migrations in <code>supabase/migrations/</code> applied.
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Create a Supabase project, then apply the migrations with the Supabase CLI (<code>supabase db push</code>).</li>
        <li>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in your hosting provider&apos;s
          environment settings (see <code>.env.example</code>). No secret keys are needed.
        </li>
        <li>Invite team members in Supabase Auth, then add their memberships (see the README).</li>
      </ol>
    </div>
  );
}
