// Fleet dashboard, technicians (the admins) only: customers' questions and the customer accounts (contract v2.4).
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getCustomers, getEnquiries } from '../api/client'
import type { CustomerRow, Enquiry } from '../api/types'
import { formatDate, formatDateTime } from '../lib/format'
import { enquiryLink } from '../lib/listing'
import { EmptyState, ErrorNotice, Loading, Panel, SectionTitle, linkClass } from './ui'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; enquiries: Enquiry[]; customers: CustomerRow[] }

const cell = 'border-b border-sunken py-2.5 pr-4 text-left align-top'

export function CustomerActivity() {
  const [state, setState] = useState<State>({ status: 'loading' })
  useEffect(() => {
    let active = true
    Promise.all([getEnquiries(), getCustomers()])
      .then(([enquiries, customers]) => {
        if (active) setState({ status: 'ready', enquiries, customers })
      })
      .catch((err) => {
        if (active) setState({ status: 'error', message: describeError(err) })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section aria-labelledby="customers" className="flex flex-col gap-[clamp(18px,2vw,26px)]">
      <SectionTitle eyebrow="03 · CUSTOMERS" title="Questions and customer accounts" id="customers" />
      {state.status === 'loading' && <Loading label="Loading the customers…" />}
      {state.status === 'error' && <ErrorNotice message={state.message} />}
      {state.status === 'ready' && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-start gap-[clamp(20px,2.4vw,32px)]">
          <Panel title="Questions from customers">
            {state.enquiries.length === 0 ? (
              <EmptyState title="No questions yet">Customers ask from a device's passport once they log in.</EmptyState>
            ) : (
              <ul aria-label="Questions from customers" className="flex flex-col">
                {state.enquiries.map((enquiry) => (
                  <li key={enquiry.id} className="flex flex-col gap-1.5 border-b border-sunken py-3.5 last:border-b-0">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs text-ink-2">
                      <Link to={`/device/${encodeURIComponent(enquiry.device_id)}`} className={`${linkClass} font-mono text-[13px]`}>
                        {enquiry.device_id}
                      </Link>
                      {formatDateTime(enquiry.created_at)}
                    </span>
                    <p className="text-[15px] text-pretty whitespace-pre-line">{enquiry.message}</p>
                    <span className="text-[13px] text-ink-2">
                      {enquiry.customer.name} ·{' '}
                      <a href={enquiryLink(enquiry.customer.email, enquiry.device_id)} className={linkClass}>
                        {enquiry.customer.email}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Customer accounts">
            {state.customers.length === 0 ? (
              <EmptyState title="No customer accounts yet">Buyers sign up themselves; nobody else can make one.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table aria-label="Customer accounts" className="w-full min-w-[420px] border-collapse text-sm">
                  <thead className="font-mono text-[11px] tracking-[.08em] text-ink-2 uppercase">
                    <tr>
                      <th className={cell}>Name</th>
                      <th className={cell}>E-mail</th>
                      <th className={cell}>Joined</th>
                      <th className={cell}>Saved</th>
                      <th className={cell}>Questions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.customers.map((row) => (
                      <tr key={row.email}>
                        <td className={`${cell} font-semibold`}>{row.name}</td>
                        <td className={`${cell} font-mono text-[13px]`}>{row.email}</td>
                        <td className={cell}>{formatDate(row.created_at)}</td>
                        <td className={`${cell} tabular-nums`}>{row.favourites}</td>
                        <td className={`${cell} tabular-nums`}>{row.enquiries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </section>
  )
}
