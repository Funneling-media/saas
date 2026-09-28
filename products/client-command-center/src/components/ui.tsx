import type { ReactNode } from "react";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
        {ok}
      </p>
    );
  }
  return null;
}

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded border border-slate-300 bg-white px-2 py-1.5"
      />
      {hint && <span className="text-xs text-slate-600">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly (readonly [string, string])[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <select name={name} required={required} defaultValue={defaultValue} className="rounded border border-slate-300 bg-white px-2 py-1.5">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "secondary" }) {
  const cls =
    tone === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100";
  return <button className={`self-start rounded px-3 py-1.5 text-sm font-medium ${cls}`}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-800 border-slate-300",
    good: "bg-green-50 text-green-900 border-green-300",
    warn: "bg-amber-50 text-amber-900 border-amber-300",
    bad: "bg-red-50 text-red-900 border-red-300",
    info: "bg-blue-50 text-blue-900 border-blue-300",
  } as const;
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Card({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Collapsible inline form, usable without JavaScript. */
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="rounded border border-slate-200 p-2">
      <summary className="cursor-pointer text-sm font-medium">{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
