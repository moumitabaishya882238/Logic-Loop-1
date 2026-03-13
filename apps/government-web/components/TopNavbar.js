export default function TopNavbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">SurakshaNet</p>
          <h1 className="text-sm font-semibold text-slate-900 sm:text-base">Government Command Dashboard</h1>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Control Room</span>
      </div>
    </header>
  );
}