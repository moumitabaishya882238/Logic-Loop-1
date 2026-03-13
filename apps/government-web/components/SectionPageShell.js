export default function SectionPageShell({ eyebrow, title, description, bullets }) {
  return (
    <main className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Phase 2 Navigation Ready</h3>
          <p className="mt-3 text-sm text-slate-600">
            This section page is now connected to the sidebar and ready for the next implementation phase.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Upcoming Work</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}