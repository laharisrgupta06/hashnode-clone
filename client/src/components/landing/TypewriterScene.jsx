// The landing page centrepiece: an illustrated typewriter with a sheet of paper whose lines type out,
// while the carriage steps along and returns. Pure SVG + CSS (styles/landing.css), no images.
// It is decorative (aria-hidden); the hero text next to it carries the meaning.
// With prefers-reduced-motion everything is shown fully typed and still.

const LINES = [
  { text: 'Field Notes, issue 01', x: 150, y: 74, size: 15, weight: 600, chars: 21 },
  { text: 'Why our build got 4x faster', x: 150, y: 104, size: 12, chars: 27 },
  { text: 'Profiling first. Then caching.', x: 150, y: 126, size: 12, chars: 30 },
  { text: 'const hit = cache.get(key);', x: 150, y: 148, size: 12, chars: 27 },
];

const KEY_ROWS = [
  { y: 352, count: 10, offset: 0 },
  { y: 376, count: 9, offset: 12 },
  { y: 400, count: 8, offset: 24 },
];

export default function TypewriterScene() {
  return (
    <div className="tw-scene" aria-hidden="true">
      <div className="tw-light" />
      <svg className="tw-svg" viewBox="0 0 520 470" role="presentation" focusable="false">
        <defs>
          <linearGradient id="tw-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4a4541" />
            <stop offset="1" stopColor="#2c2927" />
          </linearGradient>
          <linearGradient id="tw-paper" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fffdf9" />
            <stop offset="1" stopColor="#f1e9de" />
          </linearGradient>
          <linearGradient id="tw-platen" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a3633" />
            <stop offset="0.5" stopColor="#1f1d1b" />
            <stop offset="1" stopColor="#35312e" />
          </linearGradient>
          <radialGradient id="tw-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#292725" stopOpacity="0.35" />
            <stop offset="1" stopColor="#292725" stopOpacity="0" />
          </radialGradient>
          {LINES.map((line, i) => (
            <clipPath key={line.text} id={`tw-line-${i}`}>
              <rect className={`tw-reveal tw-reveal-${i}`} x={line.x - 2} y={line.y - 16} height="22" width="250" style={{ '--chars': line.chars }} />
            </clipPath>
          ))}
        </defs>

        {/* contact shadow on the desk */}
        <ellipse className="tw-floor" cx="260" cy="448" rx="210" ry="18" fill="url(#tw-shadow)" />

        <g className="tw-machine">
          {/* paper: emerges from behind the platen */}
          <g className="tw-paper">
            <path d="M128 40 L392 40 L398 214 L122 214 Z" fill="url(#tw-paper)" stroke="#d9cdbf" strokeWidth="1" />
            <line x1="140" x2="380" y1="88" y2="88" stroke="#a78355" strokeWidth="1" opacity="0.6" />
            {LINES.map((line, i) => (
              <text
                key={line.text}
                x={line.x}
                y={line.y}
                clipPath={`url(#tw-line-${i})`}
                className="tw-type"
                style={{ fontSize: line.size, fontWeight: line.weight ?? 400 }}
              >
                {line.text}
              </text>
            ))}
            <rect className="tw-cursor" x="150" y="160" width="7" height="2" fill="#a78355" />
          </g>

          {/* carriage: platen roller, knobs and paper bail; it steps left while typing */}
          <g className="tw-carriage">
            <rect x="96" y="196" width="328" height="34" rx="16" fill="url(#tw-platen)" />
            <rect x="120" y="190" width="280" height="6" rx="3" fill="#a78355" opacity="0.85" />
            <circle cx="86" cy="213" r="17" fill="#2c2927" stroke="#a78355" strokeWidth="3" />
            <circle cx="434" cy="213" r="17" fill="#2c2927" stroke="#a78355" strokeWidth="3" />
            <rect x="418" y="176" width="36" height="8" rx="4" fill="#a78355" transform="rotate(-18 436 180)" />
          </g>

          {/* body */}
          <path d="M70 252 Q72 236 92 234 L428 234 Q448 236 450 252 L470 420 Q470 432 456 432 L64 432 Q50 432 50 420 Z" fill="url(#tw-body)" />
          <path d="M96 246 L424 246" stroke="#5a544f" strokeWidth="2" />
          {/* type basket */}
          <path d="M200 252 Q260 300 320 252" fill="none" stroke="#a78355" strokeWidth="2" opacity="0.7" />
          <g className="tw-typebar">
            <line x1="260" y1="300" x2="260" y2="250" stroke="#cbb895" strokeWidth="3" strokeLinecap="round" />
          </g>
          {/* front plate with wordmark */}
          <rect x="196" y="310" width="128" height="24" rx="3" fill="#1f1d1b" />
          <text x="260" y="327" textAnchor="middle" className="tw-badge">
            DEVPRESS
          </text>

          {/* keys */}
          {KEY_ROWS.map((row, r) =>
            Array.from({ length: row.count }, (_, k) => {
              const cx = 108 + row.offset + k * 34;
              return (
                <g key={`${r}-${k}`} className={`tw-key tw-key-${(r * 7 + k * 3) % 6}`}>
                  <circle cx={cx} cy={row.y} r="11" fill="#1f1d1b" stroke="#a78355" strokeWidth="1.5" />
                  <circle cx={cx} cy={row.y - 1.5} r="7" fill="#ede6dc" />
                </g>
              );
            })
          )}
          <rect className="tw-space" x="176" y="414" width="168" height="10" rx="5" fill="#ede6dc" stroke="#a78355" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
