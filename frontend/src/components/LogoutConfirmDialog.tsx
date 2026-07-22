import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import sessionTerminateIcon from '@/assets/icons/session-terminate.svg';
import { useDesignScale } from '@/hooks/useDesignScale';

const DESIGN_WIDTH = 520;

type LogoutConfirmDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmDialog({
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const scale = useDesignScale(DESIGN_WIDTH);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      style={{ '--dialog-scale': scale } as CSSProperties}
    >
      <div
        aria-labelledby={headingId}
        aria-modal
        className="w-full max-w-[32.5rem] overflow-hidden rounded-2xl border border-pink-400/20 bg-surface shadow-[0_0_60px_-20px_rgb(219_39_119_/_0.6)] outline-none lg:w-[520px] lg:origin-center lg:[transform:scale(var(--dialog-scale))]"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-3 border-b border-pink-400/15 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center gap-1.5"
            >
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
            </span>
            <span className="truncate font-mono text-xs text-text-muted">
              benji://session/logout
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-wide text-pink-300">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-pink-400"
            />
            Unsaved glory
          </span>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-pink-400/34 bg-pink-400/10">
              <img alt="" className="size-[18px]" src={sessionTerminateIcon} />
            </span>
            <div>
              <p className="font-mono text-[9.5px] tracking-wide text-text-muted">
                SESSION_TERMINATE ?
              </p>
              <h2
                className="mt-1 text-2xl font-bold text-text-primary"
                id={headingId}
              >
                Are you sure about logging out?
              </h2>
            </div>
          </div>

          <p className="mt-5 rounded-xl border border-blue-400/20 bg-black/35 px-4 py-3 font-mono text-sm leading-relaxed text-text-secondary">
            bold move logging out one race before you stopped being terrible at
            this.
          </p>

          <div className="mt-6 flex flex-row gap-3">
            <button
              className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 px-1 font-mono text-xs font-bold text-white shadow-[0_0_20px_-6px_rgb(219_39_119_/_0.85)] transition hover:opacity-95 sm:text-base"
              onClick={onCancel}
              type="button"
            >
              I STAY. I CONQUER.
            </button>
            <button
              className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-white/14 bg-white/3 px-1 font-mono text-xs font-bold text-[#9d99a8] transition hover:border-white/25 hover:text-text-secondary sm:text-base"
              onClick={onConfirm}
              type="button"
            >
              Flee in shame
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
