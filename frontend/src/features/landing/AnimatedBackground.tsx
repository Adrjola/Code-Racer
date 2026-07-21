type AnimatedBackgroundProps = {
  className?: string;
};

export default function AnimatedBackground({
  className = '',
}: AnimatedBackgroundProps) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      id="landing-bg"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1920 1080"
    >
      <style>
        {`
          @keyframes bz-flow { to { stroke-dashoffset: -260; } }
          @keyframes bz-spin { to { transform: rotate(360deg); } }
          @keyframes bz-node { 0%, 100% { opacity: .25; } 50% { opacity: .9; } }
          @media (prefers-reduced-motion: reduce) {
            #landing-bg * { animation: none !important; }
          }
        `}
      </style>
      <defs>
        <linearGradient id="bgTrace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset=".5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>

      <g
        stroke="url(#bgTrace)"
        fill="none"
        strokeWidth="1.5"
        opacity=".55"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-20 200 H240 L320 280 H520 L580 220 H760" />
        <path d="M1920 320 H1640 L1560 400 H1360" />
        <path d="M-20 880 H180 L260 800 H460 L520 860 H700" />
        <path d="M1940 760 H1720 L1640 680 H1460 L1400 740 H1200" />
        <path d="M960 -20 V120 L1040 200 V360" />
        <path d="M300 1100 V940 L220 860 V700" />
      </g>

      <g fill="#f9a8d4">
        <circle
          cx="240"
          cy="200"
          r="4"
          style={{ animation: 'bz-node 3.2s ease-in-out infinite' }}
        />
        <circle
          cx="520"
          cy="280"
          r="4"
          fill="#60a5fa"
          style={{ animation: 'bz-node 4s ease-in-out .6s infinite' }}
        />
        <circle
          cx="1360"
          cy="400"
          r="4"
          fill="#c084fc"
          style={{ animation: 'bz-node 3.6s ease-in-out .3s infinite' }}
        />
        <circle
          cx="460"
          cy="800"
          r="4"
          fill="#60a5fa"
          style={{ animation: 'bz-node 4.4s ease-in-out .9s infinite' }}
        />
        <circle
          cx="1460"
          cy="680"
          r="4"
          fill="#f9a8d4"
          style={{ animation: 'bz-node 3s ease-in-out .2s infinite' }}
        />
        <circle
          cx="1040"
          cy="200"
          r="4"
          fill="#c084fc"
          style={{ animation: 'bz-node 3.8s ease-in-out .5s infinite' }}
        />
      </g>

      <g
        stroke="#f472b6"
        fill="none"
        strokeWidth="2"
        opacity=".7"
        strokeDasharray="14 246"
        strokeLinecap="round"
        style={{ animation: 'bz-flow 5s linear infinite' }}
      >
        <path d="M-20 200 H240 L320 280 H520 L580 220 H760" />
        <path d="M1940 760 H1720 L1640 680 H1460 L1400 740 H1200" />
      </g>
    </svg>
  );
}
