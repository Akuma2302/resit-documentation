const paths: Record<string, string> = {
  dashboard: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  receipts: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 00-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 000 2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 001.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 001.7-1l2.4 1 2-3.5-2-1.5z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  excel: 'M6 3h9l4 4v14H6V3zM14 3v5h5M9 12l5 6M14 12l-5 6',
  pdf: 'M6 3h9l4 4v14H6V3zM14 3v5h5M9 13h6M9 17h6',
  check: 'M5 13l4 4L19 7',
}

export function Icon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] ?? ''} />
    </svg>
  )
}
