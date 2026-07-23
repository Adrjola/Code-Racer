import type { ReactNode } from 'react';

type SoloRaceResultTileProps = {
  /** Tailwind classes for the tile's fill and border, which differ per tile. */
  accentClassName: string;
  caption: string | null;
  icon: ReactNode;
  label: string;
  labelClassName: string;
  left: number;
  value: string;
  valueClassName: string;
};

/**
 * One of the two boxes under the cpm headline. Without a caption the value sits
 * lower so it stays optically centred, which is how the design draws it.
 */
export function SoloRaceResultTile({
  accentClassName,
  caption,
  icon,
  label,
  labelClassName,
  left,
  value,
  valueClassName,
}: SoloRaceResultTileProps) {
  return (
    <div
      className={`absolute top-[559px] h-[135px] w-[272px] rounded-[12px] border ${accentClassName}`}
      style={{ left: `${left}px` }}
    >
      <div
        className={`absolute top-[27px] left-[24px] flex items-center gap-[6px] font-mono text-[10px] leading-[13px] tracking-[0.08em] uppercase ${labelClassName}`}
      >
        {icon}
        {label}
      </div>
      <p
        className={`absolute left-[24px] font-mono text-[38px] leading-[50px] font-bold ${valueClassName} ${
          caption === null ? 'top-[61px]' : 'top-[48px]'
        }`}
      >
        {value}
      </p>
      {caption !== null && (
        <p className="absolute top-[98px] left-[24px] font-mono text-[10px] leading-[13px] text-text-muted">
          {caption}
        </p>
      )}
    </div>
  );
}
