/**
 * Робот Кодик: білий глянцевий корпус із фіолетовими акцентами, чорний візор з усміхненими очима,
 * фіолетові «навушники», напис ITCodeCraft на грудях. Однією рукою показує долоню, другою тримає
 * ноутбук; поруч плавають картка з кодом, плитка «</>» і зірочки.
 * Чистий SVG + CSS-анімації (globals.css: robot-*), без зображень.
 * Декоративний — текст привітання поруч читається окремо.
 */

type Pt = [number, number];

/** Капсула між двома точками (сегмент кінцівки чи палець). */
function Capsule({ from, to, w, fill = "url(#rb-white)", stroke = "#ffffff", strokeWidth = 1 }: { from: Pt; to: Pt; w: number; fill?: string; stroke?: string; strokeWidth?: number }) {
  const cx = (from[0] + to[0]) / 2;
  const cy = (from[1] + to[1]) / 2;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) + w;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI - 90;
  return (
    <rect
      x={cx - w / 2}
      y={cy - len / 2}
      width={w}
      height={len}
      rx={w / 2}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      transform={`rotate(${angle.toFixed(2)} ${cx} ${cy})`}
    />
  );
}

/** Значок «</>» зі штрихів: центр і розмір. */
function CodeGlyph({ x, y, s, color, width }: { x: number; y: number; s: number; color: string; width?: number }) {
  const h = s * 0.32;
  return (
    <g stroke={color} strokeWidth={width ?? s * 0.14} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${x - s * 0.42} ${y - h}L${x - s * 0.78} ${y}L${x - s * 0.42} ${y + h}`} />
      <path d={`M${x + s * 0.14} ${y - s * 0.42}L${x - s * 0.14} ${y + s * 0.42}`} />
      <path d={`M${x + s * 0.42} ${y - h}L${x + s * 0.78} ${y}L${x + s * 0.42} ${y + h}`} />
    </g>
  );
}

/** Чотирипроменева зірочка. */
function Sparkle({ x, y, r, delay = "0s" }: { x: number; y: number; r: number; delay?: string }) {
  return (
    <path
      className="robot-core"
      style={{ animationDelay: delay }}
      d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
      fill="#8b5cf6"
    />
  );
}

const CODE_LINES: [number, number, number, string][] = [
  [16, 44, 24, "#8b5cf6"],
  [16, 51, 12, "#c084fc"],
  [31, 51, 22, "#a78bfa"],
  [16, 58, 16, "#60a5fa"],
  [35, 58, 26, "#a78bfa"],
  [16, 65, 8, "#8b5cf6"],
  [27, 65, 28, "#60a5fa"],
];

export function Robot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 320" className={`robot ${className}`} aria-hidden="true" focusable="false">
      <defs>
        {/* Білий глянець із фіолетовим рефлексом знизу */}
        <linearGradient id="rb-white" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#f7f5ff" />
          <stop offset="0.8" stopColor="#e4dcfb" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
        <radialGradient id="rb-head" cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f5f2ff" />
          <stop offset="0.85" stopColor="#ddd3fa" />
          <stop offset="1" stopColor="#b9a8f5" />
        </radialGradient>
        <linearGradient id="rb-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.45" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="rb-dark" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#5b5478" />
          <stop offset="1" stopColor="#1f1b30" />
        </radialGradient>
        <linearGradient id="rb-visor" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#2a2540" />
          <stop offset="0.5" stopColor="#0c0a16" />
          <stop offset="1" stopColor="#030207" />
        </linearGradient>
        <linearGradient id="rb-lid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9d7e4" />
          <stop offset="0.6" stopColor="#b3b0c4" />
          <stop offset="1" stopColor="#8f8ba3" />
        </linearGradient>
        <radialGradient id="rb-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#a78bfa" stopOpacity="0.18" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <filter id="rb-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="rb-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Тінь і світне кільце під роботом */}
      <ellipse className="robot-shadow" cx="147" cy="300" rx="62" ry="9" fill="url(#rb-floor)" />
      <ellipse cx="147" cy="290" rx="30" ry="5" fill="none" stroke="#c4b5fd" strokeWidth="3" opacity="0.6" filter="url(#rb-soft)" />
      <ellipse cx="147" cy="290" rx="30" ry="5" fill="none" stroke="#ffffff" strokeWidth="1.4" />

      {/* ── Плаваюча картка з кодом ── */}
      <g className="robot-drift">
        <g transform="rotate(-7 45 54)">
          <rect x="8" y="30" width="74" height="48" rx="9" fill="#a78bfa" opacity="0.25" filter="url(#rb-glow)" />
          <rect x="8" y="30" width="74" height="48" rx="9" fill="#ffffff" fillOpacity="0.78" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="10" y="32" width="70" height="44" rx="7.5" fill="none" stroke="#ddd6fe" strokeWidth="0.8" />
          {CODE_LINES.map(([x, y, w, c]) => (
            <rect key={`${x}-${y}`} x={x} y={y - 1.6} width={w} height="3.2" rx="1.6" fill={c} opacity="0.85" />
          ))}
          <CodeGlyph x={66} y={43} s={9} color="#8b5cf6" />
        </g>
      </g>

      {/* ── Фіолетова плитка «</>» ── */}
      <g className="robot-drift d2">
        <g transform="rotate(10 250 46)">
          <rect x="232" y="28" width="36" height="36" rx="8" fill="#8b5cf6" opacity="0.35" filter="url(#rb-glow)" />
          <rect x="232" y="28" width="36" height="36" rx="8" fill="url(#rb-purple)" />
          <rect x="234" y="30" width="32" height="10" rx="5" fill="#ffffff" opacity="0.18" />
          <CodeGlyph x={250} y={46} s={12} color="#ffffff" />
        </g>
      </g>

      <Sparkle x={98} y={24} r={6} />
      <Sparkle x={254} y={110} r={7} delay="0.7s" />
      <Sparkle x={20} y={100} r={3.5} delay="1.2s" />

      <g className="robot-body">
        {/* ── Ноги: дві однакові, симетрично від таза ── */}
        {([[-1, 134], [1, 160]] as const).map(([side, x]) => (
          <g key={side}>
            <circle cx={x} cy={226} r="8" fill="url(#rb-dark)" />
            <Capsule from={[x, 229]} to={[x + side * 1.5, 244]} w={20} />
            <Capsule from={[x + side * 1.5, 251]} to={[x + side * 2.5, 266]} w={22} />
            <ellipse cx={x + side * 2.2} cy={260} rx="6" ry="8.5" fill="url(#rb-purple)" />
            <ellipse cx={x + side * 2.2 - 2} cy={256} rx="1.8" ry="3.2" fill="#ffffff" opacity="0.6" />
            <circle cx={x + side * 1.5} cy={247} r="9" fill="url(#rb-purple)" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx={x + side * 1.5} cy={247} r="3.5" fill="#ede9fe" />
            <path d={`M${x + side * 3 - 13} 278c0-7 6-10 13-10s13 3 13 10-6 7-13 7-13 0-13-7z`} fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
            <path d={`M${x + side * 3 - 11} 282c5 3 17 3 22 0`} stroke="#8b5cf6" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d={`M${x + side * 1.5 - 7} 253v10`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {/* ── Пояс і таз ── */}
        <ellipse cx="147" cy="203" rx="28" ry="7" fill="url(#rb-dark)" />
        <ellipse cx="147" cy="205" rx="26" ry="4" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.8" filter="url(#rb-soft)" />
        <path d="M117 207c0-4 60-4 60 0 0 15-13 25-30 25s-30-10-30-25z" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
        <path d="M124 212c4 9 13 14 23 14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M147 208v22" stroke="#e4dcfb" strokeWidth="1" />

        {/* ── Шия ── */}
        <rect x="146" y="122" width="24" height="16" rx="6" fill="url(#rb-dark)" />
        <path d="M148 128h20M148 132h20" stroke="#6b6390" strokeWidth="1" />

        {/* ── Груди з написом ── */}
        <path d="M155 132c27 0 47 12 47 34s-16 38-46 38-48-14-48-38 20-34 47-34z" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.4" />
        <path d="M122 142c-8 16-7 40 8 56" stroke="#e4dcfb" strokeWidth="1.2" fill="none" />
        <path d="M190 144c7 16 6 38-8 54" stroke="#e4dcfb" strokeWidth="1.2" fill="none" />
        <path d="M116 156c4-11 14-17 26-19" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
        <g transform="rotate(4 160 166)">
          <text x="155" y="160" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="800" fontSize="9" letterSpacing="-0.3" fill="#2e1065">
            ITCodeCraft
          </text>
          <CodeGlyph x={155} y={176} s={10} color="#8b5cf6" />
        </g>
        <path d="M118 188c10 10 24 15 40 15" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* ── Ліва рука: показує долоню ── */}
        <Capsule from={[102, 161]} to={[82, 160]} w={17} />
        <circle cx="78" cy="160" r="7.5" fill="url(#rb-dark)" stroke="#8b5cf6" strokeWidth="1.4" />
        <Capsule from={[74, 156]} to={[57, 145]} w={18} />
        <path d="M68 150c-4-3-7-4-10-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="53" cy="142" rx="4" ry="8.5" fill="url(#rb-purple)" transform="rotate(-35 53 142)" />
        {/* Пальці й долоня */}
        <Capsule from={[38, 136]} to={[27, 128]} w={6.5} />
        <Capsule from={[41, 132]} to={[33, 121]} w={6.5} />
        <Capsule from={[45, 130]} to={[41, 117]} w={6.5} />
        <Capsule from={[49, 130]} to={[49, 119]} w={6} />
        <Capsule from={[52, 136]} to={[60, 126]} w={7} />
        <ellipse cx="45" cy="138" rx="12.5" ry="7.5" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1" transform="rotate(-25 45 138)" />
        <path d="M37 139c4 2 10 1 15-3" stroke="#ddd6fe" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Плече */}
        <circle cx="108" cy="162" r="14" fill="url(#rb-dark)" />
        <circle cx="105" cy="160" r="13" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
        <path d="M99 154c2-3 5-5 9-5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* ── Права рука з ноутбуком ── */}
        <Capsule from={[204, 166]} to={[207, 190]} w={17} />
        <circle cx="207" cy="194" r="7.5" fill="url(#rb-dark)" stroke="#8b5cf6" strokeWidth="1.4" />
        <Capsule from={[210, 197]} to={[226, 201]} w={17} />
        <circle cx="200" cy="163" r="14" fill="url(#rb-dark)" />
        <circle cx="203" cy="161" r="13" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
        <path d="M195 155c2-3 5-5 9-5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Ноутбук: клавіатурна частина й кришка зі світним логотипом */}
        <path d="M176 194l34-5 4 4-34 6z" fill="#e7e5ef" stroke="#c9c6d6" strokeWidth="1" strokeLinejoin="round" />
        <path d="M212 146l54-8c2 0 3 1 3 3l-4 44c0 2-1 3-3 3l-50 6c-2 0-3-1-3-3l0-42c0-2 1-3 3-3z" fill="url(#rb-lid)" stroke="#e7e5ef" strokeWidth="1.5" />
        <path d="M214 150l48-7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <g transform="rotate(-6 238 166)">
          <CodeGlyph x={238} y={166} s={13} color="#a78bfa" width={4} />
          <g filter="url(#rb-soft)" opacity="0.8">
            <CodeGlyph x={238} y={166} s={13} color="#c4b5fd" width={3} />
          </g>
          <g className="robot-core">
            <CodeGlyph x={238} y={166} s={13} color="#ede9fe" width={1.6} />
          </g>
        </g>
        {/* Кисть під ноутбуком, пальці спереду кришки */}
        <ellipse cx="233" cy="199" rx="11" ry="7" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1" />
        <Capsule from={[226, 197]} to={[225, 189]} w={6} />
        <Capsule from={[232, 196]} to={[232, 188]} w={6} />
        <Capsule from={[238, 196]} to={[239, 189]} w={6} />
        <Capsule from={[243, 199]} to={[247, 192]} w={6} />

        {/* ── Голова (нахилена до ноутбука) ── */}
        <g transform="rotate(9 162 80)">
          {/* Навушники */}
          <g>
            <ellipse cx="99" cy="82" rx="13" ry="24" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
            <ellipse cx="97" cy="82" rx="9.5" ry="18" fill="url(#rb-purple)" />
            <ellipse cx="96" cy="82" rx="5" ry="11" fill="#ddd6fe" />
            <ellipse cx="95" cy="78" rx="1.8" ry="4.5" fill="#ffffff" />
            <ellipse cx="225" cy="82" rx="13" ry="24" fill="url(#rb-white)" stroke="#ffffff" strokeWidth="1.2" />
            <ellipse cx="227" cy="82" rx="9.5" ry="18" fill="url(#rb-purple)" />
            <ellipse cx="228" cy="82" rx="5" ry="11" fill="#ddd6fe" />
          </g>

          {/* Шолом */}
          <rect x="102" y="28" width="120" height="104" rx="52" fill="url(#rb-head)" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M110 58c14-24 90-24 104 0" stroke="#e4dcfb" strokeWidth="1.4" fill="none" />
          <rect x="154" y="29" width="16" height="5" rx="2.5" fill="url(#rb-purple)" />
          <path d="M116 46c10-12 26-16 40-16" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M108 112c8 12 20 18 34 20" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />

          {/* Візор */}
          <rect x="112" y="50" width="100" height="74" rx="35" fill="#ddd6fe" />
          <rect x="114.5" y="52.5" width="95" height="69" rx="32.5" fill="url(#rb-visor)" />
          <path d="M126 64c14-8 46-9 66-3" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.12" />
          <path d="M200 74c4 9 5 20 2 30" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.12" />
          <path d="M122 104c3 6 7 10 12 13" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />

          {/* Усміхнені очі й рот */}
          <g className="robot-eyes">
            <g filter="url(#rb-glow)" opacity="0.8">
              <path d="M130 92Q141 76 152 92M172 92Q183 76 194 92" stroke="#3b82f6" strokeWidth="9" strokeLinecap="round" fill="none" />
            </g>
            <path d="M130 92Q141 76 152 92M172 92Q183 76 194 92" stroke="#60c5ff" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M131 91Q141 78 151 91M173 91Q183 78 193 91" stroke="#e0f7ff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
          <path d="M154 104Q162 111 170 104" stroke="#3b82f6" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.7" filter="url(#rb-glow)" />
          <path d="M154 104Q162 111 170 104" stroke="#60c5ff" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </svg>
  );
}
