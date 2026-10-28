import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-emerald-900">
            <LogoMark />
            ReCompute
          </Link>
          <SampleDataLabel />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-gray-50">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-gray-500">
          Every number in this demo is sample data that shows how the decision rule works. Nothing here is a
          measurement.
        </p>
      </footer>
    </div>
  )
}

function SampleDataLabel() {
  return (
    <span
      title="All numbers are sample values, not measurements"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold tracking-wider text-amber-900"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
      SAMPLE DATA
    </span>
  )
}

function LogoMark() {
  return (
    <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </span>
  )
}
