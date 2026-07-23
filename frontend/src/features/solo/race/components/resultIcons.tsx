/** The small glyphs on the solo result screen, sized to the 1920x1080 design. */

type IconProps = {
  className?: string;
};

export function StarIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.5Z" />
    </svg>
  );
}

/** Diagonal, matching the design's up-and-to-the-right improvement arrow. */
export function ArrowUpIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 16 16"
    >
      <path d="M4 12 12 4m0 0H5.5M12 4v6.5" />
    </svg>
  );
}

export function ArrowDownIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 16 16"
    >
      <path d="M4 4l8 8m0 0V5.5M12 12H5.5" />
    </svg>
  );
}

export function StopwatchIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="9.2" r="5.3" />
      <path d="M6.3 1.5h3.4M8 6.4v2.8l2 1.2" />
    </svg>
  );
}

/** Ranking bars, as drawn in the design's global rank tile. */
export function RankBarsIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2.2"
      viewBox="0 0 16 16"
    >
      <path d="M3.4 10.4v3.4M8 2.6v11.2M12.6 7v6.8" />
    </svg>
  );
}

/** Trophy/score icon for the Score/Code toggle. */
export function ScoreIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="M5 2h6v4a3 3 0 0 1-6 0V2ZM5 3H3.5a1.5 1.5 0 0 0 0 3H5M11 3h1.5a1.5 1.5 0 0 1 0 3H11M6 9.5l-1 4.5h6l-1-4.5" />
    </svg>
  );
}

/** Code brackets icon for the Score/Code toggle. */
export function CodeIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4" />
    </svg>
  );
}

export function RestartIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.2" />
      <path d="M13.5 2v3.2h-3.2" />
    </svg>
  );
}
