// Shared Dispango wordmark. `dark` renders white marks for the dark sidebar.
export default function Logo({ dark = false, className = "" }) {
  const text = dark ? "text-white" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-2 ${text} ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id="dg-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b5bf5" />
            <stop offset="1" stopColor="#3a34c9" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#dg-logo)" />
        <circle cx="11" cy="22" r="2.4" fill="#fff" />
        <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-[1.35rem] font-extrabold tracking-[-0.02em]">Dispango</span>
    </span>
  );
}
