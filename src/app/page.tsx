import { platformName, platformTagline } from "@/lib/branding";

const stack = [
  "Next.js 16 App Router",
  "Prisma 5 + Auth.js",
  "Tailwind CSS + Vitest"
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--primary)]">
          Diagnostic shell
        </p>

        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
          {platformName}
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
          {platformTagline}. This foundation slice keeps the existing apps intact while the
          multi-tenant platform starts from a clean App Router shell.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {stack.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/85"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
          <p className="text-sm font-medium text-white">Novaq Multi-tenant</p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Scaffold only. No customer HTML, customer JavaScript, or production data model has been
            added here.
          </p>
        </div>
      </section>
    </main>
  );
}
