import type { ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';
import type { ButtonVariant } from './Button';

type ConfirmDialogProps = {
  children?: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  description?: string;
  error?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export default function ConfirmDialog({
  children,
  confirmLabel,
  confirmVariant = 'primary',
  description,
  error,
  isSubmitting = false,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal description={description} onClose={onCancel} title={title}>
      {children}
      {error && (
        <p
          className="mt-4 rounded-[8px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button disabled={isSubmitting} onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={onConfirm}
          variant={confirmVariant}
        >
          {isSubmitting ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
