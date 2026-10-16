export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-8 sm:py-12">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-2xl font-semibold text-white">
          N
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Neguentropía</h1>
          <p className="mt-1 text-sm text-slate-600">Text analysis workspace</p>
        </div>
      </header>

      <main aria-label="Workspace" className="mx-auto w-full max-w-5xl flex-1 px-6 pb-12">
        <section aria-labelledby="workspace-status" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Application foundation</p>
          <h2 id="workspace-status" className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Workspace status
          </h2>
          <p className="mt-6 text-lg font-medium">Corpus preparation is pending.</p>
          <p className="mt-2 text-slate-600">No analysis has been run.</p>
          <p className="mt-8 max-w-xl border-t border-slate-100 pt-6 text-sm leading-6 text-slate-600">
            Algorithms and visualizations will be added module by module.
            This foundation does not load article data or contact analysis services.
          </p>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-8 text-xs text-slate-500">
        Local development foundation
      </footer>
    </div>
  );
}
