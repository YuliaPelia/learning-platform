/**
 * Робот Кодик — маскот ITCodeCraft, намальований у SVG (чіткий на будь-якому екрані).
 * Реалістичний «3D»-вигляд: глянцевий білий пластик (ключове світло зверху ліворуч, фіолетове
 * відбите світло знизу, світлий контур, м'які тіні в стиках), чорний скляний візор із сяйвом очей,
 * об'ємні фіолетові деталі, темні суглоби.
 * Анімації (globals.css: km-*): плаває, кліпає, махає рукою, картки погойдуються, зірочки мерехтять.
 * Декоративний: текст поруч читається окремо.
 */

const VIEW = { w: 400, h: 316 };

/** Градієнти й фільтри. Однакові id у кількох копіях на сторінці безпечні — визначення ідентичні. */
function Defs() {
  return (
    <defs>
      {/* Білий пластик: світло зверху ліворуч, лавандова тінь до краю */}
      <radialGradient id="km-plastic" cx="32%" cy="25%" r="85%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor="#f7f5fd" />
        <stop offset="0.78" stopColor="#e9e4f8" />
        <stop offset="1" stopColor="#c9bfea" />
      </radialGradient>
      <linearGradient id="km-plastic-v" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#f1eefa" />
        <stop offset="1" stopColor="#cfc6ec" />
      </linearGradient>
      {/* Затінення краю */}
      <radialGradient id="km-edge" cx="40%" cy="35%" r="65%">
        <stop offset="0.72" stopColor="#7c6bc4" stopOpacity="0" />
        <stop offset="1" stopColor="#7c6bc4" stopOpacity="0.26" />
      </radialGradient>
      {/* Фіолетове відбите світло знизу */}
      <linearGradient id="km-bounce" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0.6" stopColor="#8b5cf6" stopOpacity="0" />
        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.24" />
      </linearGradient>
      <linearGradient id="km-violet" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c4b5fd" />
        <stop offset="0.45" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#5b21b6" />
      </linearGradient>
      <radialGradient id="km-violet-r" cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="#ddd3ff" />
        <stop offset="0.5" stopColor="#9b6dff" />
        <stop offset="1" stopColor="#5b21b6" />
      </radialGradient>
      <linearGradient id="km-tile" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a48bf7" />
        <stop offset="1" stopColor="#7c5cf0" />
      </linearGradient>
      <linearGradient id="km-joint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#524a7c" />
        <stop offset="0.5" stopColor="#27223f" />
        <stop offset="1" stopColor="#15122a" />
      </linearGradient>
      <radialGradient id="km-joint-r" cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="#6b6396" />
        <stop offset="0.55" stopColor="#2a2547" />
        <stop offset="1" stopColor="#120f24" />
      </radialGradient>
      <radialGradient id="km-visor" cx="45%" cy="35%" r="75%">
        <stop offset="0" stopColor="#1d1934" />
        <stop offset="0.6" stopColor="#0b0a17" />
        <stop offset="1" stopColor="#040308" />
      </radialGradient>
      <linearGradient id="km-eye" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a5f3fc" />
        <stop offset="1" stopColor="#60a5fa" />
      </linearGradient>
      <linearGradient id="km-alu" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#dedbea" />
        <stop offset="0.5" stopColor="#b6b1cb" />
        <stop offset="1" stopColor="#918ca9" />
      </linearGradient>
      <linearGradient id="km-alu-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f4f2fa" />
        <stop offset="1" stopColor="#a39eba" />
      </linearGradient>
      <linearGradient id="km-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.94" />
        <stop offset="1" stopColor="#f3efff" stopOpacity="0.72" />
      </linearGradient>
      <radialGradient id="km-floor" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#a78bfa" stopOpacity="0.45" />
        <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="km-bg" cx="50%" cy="20%" r="85%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#ece8fb" />
      </radialGradient>

      <filter id="km-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="4" result="b1" />
        <feGaussianBlur stdDeviation="9" result="b2" />
        <feMerge>
          <feMergeNode in="b2" />
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="km-glow-s" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="km-blur2" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id="km-blur4" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id="km-blur8" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id="km-blur30" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="30" />
      </filter>
      <filter id="km-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#5b3fbf" floodOpacity="0.2" />
      </filter>
      <filter id="km-card-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#6d4aff" floodOpacity="0.14" />
      </filter>
    </defs>
  );
}

/** Чотирипроменева зірочка з легким ореолом. */
const Sparkle = ({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) => {
  const d = `M${x} ${y - 10 * s}C${x + 1.6 * s} ${y - 2.2 * s} ${x + 2.2 * s} ${y - 1.6 * s} ${x + 10 * s} ${y}C${x + 2.2 * s} ${y + 1.6 * s} ${x + 1.6 * s} ${y + 2.2 * s} ${x} ${y + 10 * s}C${x - 1.6 * s} ${y + 2.2 * s} ${x - 2.2 * s} ${y + 1.6 * s} ${x - 10 * s} ${y}C${x - 2.2 * s} ${y - 1.6 * s} ${x - 1.6 * s} ${y - 2.2 * s} ${x} ${y - 10 * s}z`;
  return (
    <g className="km-twinkle" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}>
      <path d={d} fill="#a78bfa" opacity="0.35" filter="url(#km-blur2)" />
      <path d={d} fill="#8b5cf6" />
    </g>
  );
};

/** Біла пластикова деталь: основа + край + фіолетове відбите світло + світлий контур. */
function Plastic({ d, flat = false }: { d: string; flat?: boolean }) {
  return (
    <>
      <path d={d} fill={flat ? "url(#km-plastic-v)" : "url(#km-plastic)"} />
      <path d={d} fill="url(#km-edge)" />
      <path d={d} fill="url(#km-bounce)" />
      <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.2" />
    </>
  );
}

/** Палець-«ковбаска» з темною кісточкою посередині. */
function Finger({ d, knuckle, w = 8.5 }: { d: string; knuckle: [number, number]; w?: number }) {
  return (
    <>
      <path d={d} stroke="#c9bfea" strokeWidth={w + 1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={d} stroke="url(#km-plastic-v)" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={knuckle[0]} cy={knuckle[1]} r="2.8" fill="url(#km-joint-r)" />
    </>
  );
}

/** Сам робот (без фону) — спільний для великої ілюстрації й аватарки. */
function RobotArt({ animate }: { animate: boolean }) {
  return (
    <g className={`km${animate ? "" : " km-still"}`}>
      {/* Сяйне кільце-«майданчик» */}
      <ellipse cx="194" cy="312" rx="44" ry="7" fill="url(#km-floor)" />
      <ellipse cx="194" cy="312" rx="31" ry="4.5" fill="none" stroke="#c4b5fd" strokeWidth="4" opacity="0.45" filter="url(#km-blur2)" />
      <ellipse className="km-ring" cx="194" cy="312" rx="31" ry="4.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />

      {/* ── Скляна картка з кодом (з товщиною скла) ── */}
      <g className="km-card">
        <g transform="rotate(-6 70 82)" filter="url(#km-card-shadow)">
          <rect x="22" y="49" width="98" height="72" rx="13" fill="#d9d0ff" opacity="0.5" />
          <rect x="20" y="46" width="98" height="72" rx="13" fill="url(#km-glass)" />
          <rect x="20" y="46" width="98" height="72" rx="13" fill="none" stroke="#ffffff" strokeWidth="1.6" />
          <rect x="22" y="48" width="94" height="28" rx="11" fill="#ffffff" opacity="0.4" />
          <rect x="35" y="62" width="30" height="4.5" rx="2.25" fill="#8b5cf6" />
          <rect x="35" y="72" width="12" height="4.5" rx="2.25" fill="#c084fc" />
          <rect x="49" y="72" width="22" height="4.5" rx="2.25" fill="#a78bfa" />
          <rect x="35" y="82" width="56" height="4.5" rx="2.25" fill="#8b5cf6" opacity="0.85" />
          <rect x="35" y="92" width="18" height="4.5" rx="2.25" fill="#60a5fa" />
          <rect x="56" y="92" width="9" height="4.5" rx="2.25" fill="#e879f9" />
          <rect x="68" y="92" width="26" height="4.5" rx="2.25" fill="#818cf8" />
          <rect x="35" y="102" width="9" height="4.5" rx="2.25" fill="#a78bfa" />
          <rect x="47" y="102" width="32" height="4.5" rx="2.25" fill="#60a5fa" />
          <path d="M84 60l-5 4.5 5 4.5M98 60l5 4.5-5 4.5M93 58l-4 13" stroke="#7c3aed" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* ── Фіолетова 3D-плитка «</>» ── */}
      <g className="km-tile">
        <g transform="rotate(8 352 76)" filter="url(#km-card-shadow)">
          <rect x="328" y="55" width="52" height="48" rx="11" fill="#6a4fd8" />
          <rect x="326" y="50" width="52" height="48" rx="11" fill="url(#km-tile)" />
          <rect x="328" y="52" width="48" height="20" rx="9" fill="#ffffff" opacity="0.2" />
          <path d="M344 66l-7 8 7 8M360 66l7 8-7 8M355 63l-6 22" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      <Sparkle x={133} y={41} s={0.9} />
      <Sparkle x={337} y={130} s={1} delay={1} />

      {/* ── Тіло плаває ── */}
      <g className="km-body" filter="url(#km-shadow)">
        {/* Задня нога: лише суглоб і край стегна */}
        <circle cx="222" cy="242" r="7" fill="url(#km-joint-r)" />
        <Plastic d="M216 244c4-5 12-5 15 1l5 12c2 5-1 10-6 11s-9-2-11-6l-5-10c-1-3 0-6 2-8z" />

        {/* Таз-напівсфера */}
        <Plastic d="M175 228c0-6 13-10 30-10s30 4 30 10c0 10-13 18-30 18s-30-8-30-18z" />

        {/* Передня нога: стегно → коліно → гомілка → стопа */}
        <Plastic d="M190 236c6-6 16-4 19 3s0 12-6 16l-14 10c-6 4-13 2-15-4s0-11 5-14z" />
        {/* Коліно: біла оболонка з фіолетовим диском збоку */}
        <circle cx="178" cy="264" r="15" fill="url(#km-plastic)" />
        <circle cx="178" cy="264" r="15" fill="url(#km-edge)" />
        <circle cx="178" cy="264" r="15" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <ellipse cx="171" cy="264" rx="8.5" ry="11.5" fill="url(#km-violet-r)" />
        <ellipse cx="169.5" cy="264" rx="4.5" ry="6.5" fill="#e4dbff" />
        <ellipse cx="190" cy="270" rx="9" ry="5" fill="#2e2560" opacity="0.3" filter="url(#km-blur4)" />
        {/* Гомілка й стопа носком донизу */}
        <Plastic d="M176 276c6-4 17-2 20 6l4 12c2 7-2 13-9 14s-13-3-14-10l-3-13c-1-4 0-7 2-9z" />
        <path d="M180 304c4 6 12 7 18 3" stroke="url(#km-violet)" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* ── Тулуб-«бочка» ── */}
        <Plastic d="M170 146C190 140 226 140 246 146C258 150 264 160 263 176C262 196 250 214 238 222C222 228 192 228 177 222C164 214 152 196 152 176C152 160 158 150 170 146Z" />
        {/* Сяйне фіолетове кільце на стику з тазом */}
        <ellipse cx="206" cy="224" rx="29" ry="5" fill="none" stroke="#a78bfa" strokeWidth="2.4" filter="url(#km-glow-s)" />
        {/* Тінь від голови на грудях */}
        <ellipse cx="208" cy="150" rx="44" ry="7" fill="#2e2560" opacity="0.32" filter="url(#km-blur4)" />
        {/* Блік на грудях */}
        <ellipse cx="178" cy="166" rx="14" ry="7" fill="#ffffff" opacity="0.85" transform="rotate(-30 178 166)" filter="url(#km-blur2)" />
        {/* Напис і логотип */}
        <g transform="rotate(-4 212 176)">
          <text x="206" y="176" textAnchor="middle" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="9.6" fontWeight="800" fill="#1e1b4b" letterSpacing="-0.2">
            ITCodeCraft
          </text>
          <path d="M198 185l-6 5.5 6 5.5M216 185l6 5.5-6 5.5M210 183l-5 15" stroke="#8b5cf6" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#km-glow-s)" />
        </g>

        {/* ── Права рука: плече → лікоть (за ноутбуком) ── */}
        <circle cx="262" cy="170" r="9" fill="url(#km-joint-r)" />
        <Plastic d="M258 176c4-6 12-6 16-1l10 16c4 6 2 13-4 16s-13 1-16-5l-8-15c-2-4-1-8 2-11z" />
        <circle cx="280" cy="206" r="7" fill="url(#km-joint-r)" />
        <ellipse cx="280" cy="212" rx="12" ry="6" fill="#8b5cf6" opacity="0.35" filter="url(#km-blur4)" />
        <Plastic d="M282 200c6-3 14-1 20 3l14 10c5 4 6 10 2 14s-10 4-15 1l-17-10c-6-4-8-10-4-18z" />

        {/* Плечові накладки */}
        <circle cx="256" cy="165" r="16" fill="url(#km-plastic)" />
        <circle cx="256" cy="165" r="16" fill="url(#km-bounce)" />
        <circle cx="256" cy="165" r="16" fill="none" stroke="#ffffff" strokeWidth="1.2" />

        {/* ── Ноутбук: основа + кришка в перспективі ── */}
        <path d="M234 213l54 3-2 6-54-3z" fill="url(#km-alu-edge)" />
        <path d="M236 214l50 3" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
        <path d="M309 157l60 2c3 0 4 2 3 5l-20 54c-1 2-3 3-5 3l-68-4c-3 0-4-2-3-4l26-53c1-2 4-3 7-3z" fill="url(#km-alu)" />
        <path d="M309 157l60 2c3 0 4 2 3 5l-20 54c-1 2-3 3-5 3l-68-4c-3 0-4-2-3-4l26-53c1-2 4-3 7-3z" fill="none" stroke="#f4f2fa" strokeWidth="1.4" />
        <path d="M312 161l36 1-30 52-28-2z" fill="#ffffff" opacity="0.13" />
        <path d="M313 178l-8 8 8 8M335 178l8 8-8 8M328 174l-8 25" stroke="#e9e4ff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#km-glow)" />

        {/* Кисть під правим нижнім кутом кришки: пальці обхоплюють край */}
        <Plastic d="M302 222c4-5 14-6 22-3l12 4c5 2 7 7 4 11s-9 5-14 3l-16-4c-6-2-10-6-8-11z" />
        <Finger d="M312 226l-2-9" knuckle={[311, 221]} w={7} />
        <Finger d="M321 228l-1-10" knuckle={[320.5, 222]} w={7} />
        <Finger d="M330 230l1-9" knuckle={[330.5, 224]} w={7} />

        {/* ── Ліва рука простягнута, долоня вгору — махає ── */}
        <g className="km-wave">
          <circle cx="150" cy="165" r="10" fill="url(#km-joint-r)" />
          {/* Передпліччя-циліндр */}
          <Plastic d="M110 162c2-8 10-12 18-11l18 3c9 2 14 10 12 19s-10 13-19 12l-18-3c-8-2-13-10-11-20z" />
          <ellipse cx="137" cy="195" rx="14" ry="5" fill="#8b5cf6" opacity="0.3" filter="url(#km-blur4)" />
          {/* Зап'ястя */}
          <ellipse cx="106" cy="163" rx="6" ry="9" fill="url(#km-joint-r)" transform="rotate(-15 106 163)" />
          {/* Долоня догори */}
          <Plastic d="M68 156c2-9 14-14 26-12s16 9 14 16-12 12-24 11-17-7-16-15z" />
          {/* Великий палець угору */}
          <Finger d="M100 150c3-6 4-12 3-18" knuckle={[102, 141]} w={9} />
          {/* Чотири пальці, загнуті до глядача й ліворуч */}
          <Finger d="M74 148l-12-8-6 5" knuckle={[62, 140]} />
          <Finger d="M70 155l-15-4-5 6" knuckle={[55, 151]} />
          <Finger d="M70 162l-14 0-4 7" knuckle={[56, 162]} />
          <Finger d="M74 168l-11 4-2 7" knuckle={[63, 172]} />
          {/* Блік на долоні */}
          <ellipse cx="86" cy="152" rx="9" ry="3.5" fill="#ffffff" opacity="0.8" transform="rotate(-8 86 152)" filter="url(#km-blur2)" />
        </g>

        {/* Ліва плечова накладка (поверх руки) */}
        <circle cx="160" cy="160" r="16" fill="url(#km-plastic)" />
        <circle cx="160" cy="160" r="16" fill="url(#km-bounce)" />
        <circle cx="160" cy="160" r="16" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <ellipse cx="154" cy="153" rx="6" ry="3" fill="#ffffff" opacity="0.9" transform="rotate(-30 154 153)" filter="url(#km-blur2)" />

        {/* ── Голова, нахилена на 9° ── */}
        <g transform="rotate(9 222 86)">
          {/* Шия */}
          <rect x="206" y="140" width="32" height="14" rx="7" fill="url(#km-joint)" />

          {/* Праве вухо — видне з ребра, позаду */}
          <ellipse cx="309" cy="88" rx="9" ry="23" fill="#ffffff" />
          <ellipse cx="310" cy="88" rx="6.5" ry="19" fill="url(#km-violet-r)" />

          {/* Шолом */}
          <ellipse cx="222" cy="86" rx="88" ry="66" fill="url(#km-plastic)" />
          <ellipse cx="222" cy="86" rx="88" ry="66" fill="url(#km-edge)" />
          <ellipse cx="222" cy="86" rx="88" ry="66" fill="url(#km-bounce)" />
          <ellipse cx="222" cy="86" rx="88" ry="66" fill="none" stroke="#ffffff" strokeWidth="1.4" />
          {/* Великий блік зверху ліворуч */}
          <ellipse cx="176" cy="40" rx="30" ry="10" fill="#ffffff" opacity="0.9" transform="rotate(-25 176 40)" filter="url(#km-blur2)" />

          {/* Обідок-бевел візора й тонкий шов */}
          <rect x="164" y="44" width="132" height="96" rx="44" fill="none" stroke="#ddd6fe" strokeWidth="1.2" />
          <rect x="168" y="48" width="124" height="88" rx="40" fill="#d9d2f5" />
          {/* Візор */}
          <rect x="171.5" y="51.5" width="117" height="81" rx="37" fill="url(#km-visor)" />
          {/* Фіолетовий внутрішній відблиск і дуга-блік уздовж верхнього краю */}
          <ellipse cx="200" cy="68" rx="30" ry="15" fill="#3b2a7a" opacity="0.5" filter="url(#km-blur8)" />
          <path d="M186 62c18-9 60-10 88-2" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.35" />
          <path d="M282 78c3 10 3 22-1 32" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.12" />
          {/* Очі підсвічують скло */}
          <ellipse cx="232" cy="98" rx="46" ry="14" fill="#60a5fa" opacity="0.12" filter="url(#km-blur8)" />

          {/* Очі-дужки світяться й кліпають */}
          <g className="km-eyes" filter="url(#km-glow)">
            <path d="M187 95c5-19 28-19 33 0" stroke="url(#km-eye)" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M249 95c4-17 24-17 28 0" stroke="url(#km-eye)" strokeWidth="8" fill="none" strokeLinecap="round" />
          </g>
          <path d="M189.5 93c5-15 23-15 28 0M251 93c4-13 20-13 24 0" stroke="#e0f7ff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M223 106q8 9 16 0" stroke="url(#km-eye)" strokeWidth="4.5" fill="none" strokeLinecap="round" filter="url(#km-glow)" />

          {/* Ліве вухо спереду: концентричні кола в анфас */}
          <ellipse cx="136" cy="86" rx="20" ry="30" fill="url(#km-plastic)" />
          <ellipse cx="136" cy="86" rx="20" ry="30" fill="none" stroke="#ffffff" strokeWidth="1.2" />
          <ellipse cx="134" cy="86" rx="15" ry="24" fill="url(#km-violet-r)" />
          <ellipse cx="133" cy="86" rx="9" ry="16" fill="#6d5bd0" />
          <ellipse cx="132" cy="86" rx="5" ry="10" fill="url(#km-violet)" opacity="0.8" />
          <ellipse cx="128" cy="76" rx="2.5" ry="6" fill="#ffffff" opacity="0.85" />
        </g>
      </g>
    </g>
  );
}

export function Mascot({
  className = "",
  framed = false,
  cover = false,
  float = true,
}: {
  className?: string;
  framed?: boolean;
  /** заповнити контейнер повністю (обрізаючи краї) — для великих карток-ілюстрацій */
  cover?: boolean;
  float?: boolean;
  /** Лишилися від версії з картинкою — для SVG не потрібні */
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div aria-hidden className={`relative overflow-hidden ${framed ? "rounded-(--radius-card) bg-[#efeafd]" : ""} ${className}`}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio={cover ? "xMidYMid slice" : "xMidYMid meet"} className="h-full w-full" focusable="false">
        <Defs />
        {framed && (
          <>
            <rect width={VIEW.w} height={VIEW.h} fill="url(#km-bg)" />
            <circle cx="70" cy="250" r="60" fill="#c4b5fd" opacity="0.35" filter="url(#km-blur30)" />
          </>
        )}
        <RobotArt animate={float} />
      </svg>
    </div>
  );
}

/** Кругла «аватарка» з головою робота — для підказок і порожніх станів. */
export function MascotAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-[#efeafd] ring-4 ring-white ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Та сама графіка, але кадр лише на голову */}
      <svg viewBox="118 4 196 196" className="h-full w-full" focusable="false">
        <Defs />
        <RobotArt animate />
      </svg>
    </span>
  );
}
