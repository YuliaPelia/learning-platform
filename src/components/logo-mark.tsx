/** Знак логотипа: темне коло з дужками коду — той самий, що на заставці сайту. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-full bg-text text-white shadow-pill"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="relative">
        <path d="M8 7.5 3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.5 5l-3 14" />
      </svg>
    </span>
  );
}
