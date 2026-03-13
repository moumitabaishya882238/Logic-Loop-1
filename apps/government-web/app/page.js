export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">SurakshaNet Command Center</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Phase 2 navigation is complete. Statistics cards, incident feed, and live map logic will be added in the next phases.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-lg font-semibold text-slate-900">Incident Feed Area</h3>
          <p className="mt-3 text-sm text-slate-600">Placeholder panel for upcoming live incident feed component.</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="text-lg font-semibold text-slate-900">Mini Map Preview Area</h3>
          <p className="mt-3 text-sm text-slate-600">Placeholder panel for map integration in later phases.</p>
        </article>
      </section>
    </main>
  );
}