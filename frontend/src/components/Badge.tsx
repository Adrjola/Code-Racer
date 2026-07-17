import type { ReactNode } from 'react';

export type BadgeTone = 'danger' | 'muted' | 'neutral' | 'positive';

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

const baseClassName =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide';

const toneClassName: Record<BadgeTone, string> = {
  danger: 'border-red-400/35 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/[0.03] text-text-muted',
  neutral: 'border-purple-400/35 bg-purple-400/10 text-purple-300',
  positive: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
};

export default function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={`${baseClassName} ${toneClassName[tone]}`}>
      {children}
    </span>
  );
}
