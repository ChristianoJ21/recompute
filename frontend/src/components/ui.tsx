import { useId, type ReactNode } from 'react'

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'

export function Card({
  title,
  action,
  id,
  children,
}: {
  title: string
  action?: ReactNode
  id?: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-10 text-sm text-gray-500">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
      {label}
    </p>
  )
}
