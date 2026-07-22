import { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import TextField from '@/components/TextField';
import type {
  AdminUser,
  AdminUserEditValues,
} from '@/features/admin/users/usersApi';
import {
  hasFormErrors,
  validateUserEdit,
  type FormErrors,
} from '@/features/admin/users/validation';

type UserEditDialogProps = {
  error?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: AdminUserEditValues) => void;
  user: AdminUser;
};

export default function UserEditDialog({
  error,
  isSubmitting,
  onCancel,
  onSubmit,
  user,
}: UserEditDialogProps) {
  const [values, setValues] = useState<AdminUserEditValues>({
    email: user.email,
    username: user.username,
  });
  const [errors, setErrors] = useState<FormErrors<AdminUserEditValues>>({});

  const setValue =
    <Field extends keyof AdminUserEditValues>(field: Field) =>
    (value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const handleSubmit = () => {
    const nextErrors = validateUserEdit(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }

    onSubmit({
      email: values.email.trim(),
      username: values.username.trim(),
    });
  };

  return (
    <Modal onClose={onCancel} title="Edit user">
      <TextField
        error={errors.username}
        id="edit-user-username"
        label="Username"
        onChange={setValue('username')}
        placeholder="username"
        value={values.username}
      />
      <TextField
        className="mt-5"
        error={errors.email}
        id="edit-user-email"
        label="Email"
        onChange={setValue('email')}
        placeholder="user@example.com"
        type="email"
        value={values.email}
      />
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
          onClick={handleSubmit}
          variant="primary"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
