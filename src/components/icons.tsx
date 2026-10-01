/** Прості SVG-іконки (обведення), колір береться з тексту: className="text-accent". */
type P = { className?: string; size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconCheck = ({ className, size }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.4}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconX = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const IconArrow = ({ className, size }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconFlame = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 2 3-3z" />
  </svg>
);
export const IconStar = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z" />
  </svg>
);
export const IconLock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconClock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconGift = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" />
  </svg>
);
export const IconPlay = ({ className, size }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M7 4v16l13-8z" />
  </svg>
);
export const IconCode = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
  </svg>
);
