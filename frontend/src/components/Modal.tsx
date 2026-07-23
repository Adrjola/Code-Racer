import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './icons';

type ModalProps = {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
};

const backdropClassName =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';

const panelClassName =
  'max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-pink-400/20 bg-surface p-[clamp(1.25rem,3vw,1.75rem)] shadow-[0_0_60px_-20px_rgb(219_39_119_/_0.6)] outline-none';

export default function Modal({
  children,
  description,
  onClose,
  title,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className={backdropClassName}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={headingId}
        aria-modal
        className={panelClassName}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            className="text-lg font-extrabold text-text-primary"
            id={headingId}
          >
            {title}
          </h2>
          <button
            aria-label="Close"
            className="-mt-1 -mr-1 shrink-0 rounded-[8px] p-1.5 text-text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text-primary"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        {description && (
          <p
            className="mt-1.5 text-sm leading-[1.5] text-text-secondary"
            id={descriptionId}
          >
            {description}
          </p>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
