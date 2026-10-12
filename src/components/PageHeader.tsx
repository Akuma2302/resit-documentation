import Link from 'next/link'

export type Crumb = { label: string; href?: string }

// Page title with a breadcrumb trail; the last crumb is the current page.
export function PageHeader({ title, crumbs, children }: { title: string; crumbs: Crumb[]; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-slate-500">
          {crumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-brand-700">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-brand-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
