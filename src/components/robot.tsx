/**
 * Скляний робот Кодик: прозорий райдужний шолом, чорний візор із великими сяйливими очима,
 * «стрибок» у повітрі й голографічний планшет зі свічковим графіком прогресу.
 * Чистий SVG + CSS-анімації (globals.css: robot-*), без зображень.
 * Декоративний — текст привітання поруч читається окремо.
 */

/** Свічки графіка в координатах планшета (0…100 × 0…60): x, верх і низ тіла, верх і низ «ґноту», колір. */
const CANDLES: [number, number, number, number, number, string][] = [
  [12, 44, 50, 41, 53, "#34d399"],
  [20, 42, 47, 39, 50, "#fb7185"],
  [28, 38, 46, 35, 48, "#34d399"],
  [36, 34, 41, 31, 44, "#34d399"],
  [44, 36, 40, 33, 43, "#fb7185"],
  [52, 28, 38, 25, 40, "#34d399"],
  [60, 30, 35, 27, 38, "#fb923c"],
  [68, 22, 32, 19, 34, "#34d399"],
  [76, 16, 26, 13, 28, "#34d399"],
  [84, 18, 23, 15, 26, "#fb7185"],
  [92, 9, 20, 6, 22, "#34d399"],
];

export function Robot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 300" className={`robot ${className}`} aria-hidden="true" focusable="false">
      <defs>
        {/* Райдужне скло: білий блиск, бузковий, рожевий, персиковий і блакитний відтінки */}
        <linearGradient id="rb-glass" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#eceaff" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#fbe1f1" stopOpacity="0.92" />
          <stop offset="0.8" stopColor="#fde4c8" stopOpacity="0.92" />
          <stop offset="1" stopColor="#cdeefe" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="rb-glass-edge" cx="40%" cy="35%" r="70%">
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.88" stopColor="#c4b5fd" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="rb-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.35" stopColor="#f0abfc" />
          <stop offset="0.65" stopColor="#fdba74" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id="rb-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1a33" />
          <stop offset="1" stopColor="#05050d" />
        </linearGradient>
        <radialGradient id="rb-iris" cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#d6f3ff" />
          <stop offset="0.45" stopColor="#4fa8ff" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="rb-joint" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#8b8aa8" />
          <stop offset="1" stopColor="#2a2940" />
        </radialGradient>
        <linearGradient id="rb-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ede9fe" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#c7d2fe" stopOpacity="0.45" />
          <stop offset="1" stopColor="#bae6fd" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="rb-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fdba74" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
        <filter id="rb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id="rb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Райдужна тінь на «підлозі» */}
      <ellipse className="robot-shadow" cx="128" cy="288" rx="64" ry="7" fill="url(#rb-floor)" />

      <g className="robot-body">
        {/* ── Ноги в «стрибку» ── */}
        <g stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5">
          <rect x="98" y="206" width="24" height="38" rx="12" fill="url(#rb-glass)" transform="rotate(16 110 225)" />
          <circle cx="102" cy="247" r="8" fill="url(#rb-joint)" stroke="none" />
          <rect x="88" y="248" width="26" height="30" rx="12" fill="url(#rb-glass)" transform="rotate(-8 101 263)" />
          <ellipse cx="101" cy="281" rx="16" ry="7" fill="url(#rb-glass)" />

          <rect x="138" y="204" width="24" height="36" rx="12" fill="url(#rb-glass)" transform="rotate(-28 150 222)" />
          <circle cx="163" cy="240" r="8" fill="url(#rb-joint)" stroke="none" />
          <rect x="153" y="240" width="25" height="30" rx="12" fill="url(#rb-glass)" transform="rotate(32 165 255)" />
          <ellipse cx="176" cy="268" rx="15" ry="7" fill="url(#rb-glass)" transform="rotate(30 176 268)" />
        </g>

        {/* ── Тулуб і шия ── */}
        <rect x="96" y="156" width="68" height="62" rx="26" fill="url(#rb-glass)" stroke="#ffffff" strokeWidth="2" />
        <rect x="96" y="156" width="68" height="62" rx="26" fill="url(#rb-glass-edge)" />
        <rect x="111" y="170" width="38" height="20" rx="8" fill="#1e1b4b" opacity="0.85" />
        <circle className="robot-core" cx="121" cy="180" r="2.5" fill="#67e8f9" />
        <circle className="robot-core" cx="130" cy="180" r="2.5" fill="#a78bfa" style={{ animationDelay: "0.4s" }} />
        <circle className="robot-core" cx="139" cy="180" r="2.5" fill="#f0abfc" style={{ animationDelay: "0.8s" }} />
        <path d="M104 166c4-6 10-9 16-10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />

        {/* ── Руки (за планшетом) ── */}
        <g stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5">
          <circle cx="98" cy="172" r="11" fill="url(#rb-joint)" stroke="none" />
          <rect x="90" y="176" width="20" height="46" rx="10" fill="url(#rb-glass)" transform="rotate(-26 100 199)" />
          <circle cx="163" cy="168" r="11" fill="url(#rb-joint)" stroke="none" />
          <rect x="166" y="164" width="20" height="50" rx="10" fill="url(#rb-glass)" transform="rotate(-58 176 189)" />
        </g>

        {/* ── Голографічний планшет: локальні координати 0…100 × 0…60, нахилені в перспективі ── */}
        <g className="robot-tablet" transform="matrix(1.22 -0.29 0.13 1.33 116 166)">
          <rect x="-2" y="-2" width="104" height="64" rx="7" fill="#a5b4fc" opacity="0.35" filter="url(#rb-glow)" />
          <rect x="0" y="0" width="100" height="60" rx="5" fill="url(#rb-holo)" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <rect x="6" y="5" width="14" height="3" rx="1.5" fill="#ffffff" opacity="0.85" />
          <rect x="22" y="5" width="8" height="3" rx="1.5" fill="#ffffff" opacity="0.5" />
          {[16, 28, 40, 52].map((y) => (
            <line key={y} x1="4" x2="96" y1={y} y2={y} stroke="#6366f1" strokeOpacity="0.25" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          ))}
          {CANDLES.map(([x, top, bottom, hi, lo, color], i) => (
            <g key={x} className={`robot-bar b${(i % 4) + 1}`}>
              <line x1={x} x2={x} y1={hi} y2={lo} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={x - 2} y={top} width="4" height={bottom - top} rx="0.8" fill={color} />
            </g>
          ))}
          <path d="M6 50C18 46 28 42 40 40S62 30 72 24 88 14 96 8" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.5" filter="url(#rb-soft)" vectorEffect="non-scaling-stroke" />
          <path d="M6 50C18 46 28 42 40 40S62 30 72 24 88 14 96 8" stroke="#fde68a" strokeWidth="1.6" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle className="robot-core" cx="96" cy="8" r="2" fill="#fde68a" />
        </g>

        {/* ── Кисті тримають планшет (поверх нього) ── */}
        <g fill="url(#rb-glass)" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="1.5">
          <ellipse cx="124" cy="240" rx="13" ry="11" />
          <path d="M116 233l-4-8M123 230l-2-9M130 231l1-8" stroke="#c7c5e8" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="243" cy="200" rx="11" ry="13" />
          <path d="M236 190l-5-5M235 199l-6-2M236 208l-6 1" stroke="#c7c5e8" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* ── Голова ── */}
        {/* Вушка-«навушники»: прозорі циліндри з райдужними кільцями */}
        <g stroke="#ffffff" strokeWidth="1.5">
          <ellipse cx="201" cy="90" rx="10" ry="21" fill="url(#rb-glass)" />
          <ellipse cx="44" cy="98" rx="15" ry="25" fill="url(#rb-glass)" />
          <ellipse cx="42" cy="98" rx="9" ry="17" fill="none" stroke="url(#rb-rim)" strokeWidth="3" />
          <ellipse cx="41" cy="98" rx="4" ry="9" fill="#ffffff" opacity="0.7" stroke="none" />
        </g>

        {/* Скляний шолом */}
        <ellipse cx="123" cy="92" rx="80" ry="74" fill="url(#rb-glass)" stroke="#ffffff" strokeWidth="2.5" />
        <ellipse cx="123" cy="92" rx="80" ry="74" fill="url(#rb-glass-edge)" />
        <path d="M50 64C78 30 166 26 196 62" stroke="url(#rb-rim)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
        <path d="M54 60C82 28 162 24 192 58" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.9" />

        {/* Візор */}
        <rect x="64" y="54" width="118" height="88" rx="42" fill="url(#rb-visor)" />
        <rect x="64" y="54" width="118" height="88" rx="42" fill="none" stroke="url(#rb-rim)" strokeWidth="2" opacity="0.6" />
        <path d="M80 70c16-10 50-12 72-6" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.14" />

        {/* Очі кліпають */}
        <g className="robot-eyes">
          <circle cx="100" cy="100" r="19" fill="#38bdf8" opacity="0.45" filter="url(#rb-glow)" />
          <circle cx="146" cy="100" r="19" fill="#38bdf8" opacity="0.45" filter="url(#rb-glow)" />
          <circle cx="100" cy="100" r="15" fill="url(#rb-iris)" stroke="#7dd3fc" strokeWidth="1.5" />
          <circle cx="146" cy="100" r="15" fill="url(#rb-iris)" stroke="#7dd3fc" strokeWidth="1.5" />
          <circle cx="105" cy="94" r="4.5" fill="#ffffff" />
          <circle cx="151" cy="94" r="4.5" fill="#ffffff" />
          <circle cx="95" cy="106" r="2" fill="#ffffff" opacity="0.8" />
          <circle cx="141" cy="106" r="2" fill="#ffffff" opacity="0.8" />
        </g>
        <path d="M114 123q9 8 18 0" stroke="#7dd3fc" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Відблиски скла */}
        <path d="M62 52C76 32 100 22 124 20" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.95" />
        <ellipse cx="70" cy="136" rx="5" ry="11" fill="#fdba74" opacity="0.25" transform="rotate(35 70 136)" />
        <ellipse cx="192" cy="118" rx="4" ry="14" fill="#c4b5fd" opacity="0.35" transform="rotate(-20 192 118)" />
        <circle cx="168" cy="40" r="4" fill="#ffffff" opacity="0.8" />
      </g>
    </svg>
  );
}
