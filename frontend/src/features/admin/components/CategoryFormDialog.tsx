import { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import TextAreaField from '@/components/TextAreaField';
import TextField from '@/components/TextField';
import type { Category, CategoryValues } from '@/features/admin/api';
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  hasFormErrors,
  validateCategory,
  type FormErrors,
} from '@/features/admin/validation';

type CategoryFormDialogProps = {
  category?: Category;
  error?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CategoryValues) => void;
};

export default function CategoryFormDialog({
  category,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}: CategoryFormDialogProps) {
  const isEdit = category !== undefined;
  const [values, setValues] = useState<CategoryValues>({
    description: category?.description ?? '',
    name: category?.name ?? '',
  });
  const [errors, setErrors] = useState<FormErrors<CategoryValues>>({});

  const setValue = (field: keyof CategoryValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = () => {
    const nextErrors = validateCategory(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }
    onSubmit({
      description: values.description.trim(),
      name: values.name.trim(),
    });
  };

  return (
    <Modal
      description={
        isEdit
          ? 'Renaming a category does not change the snippets already in it.'
          : 'Categories group snippets by topic, such as Java basics.'
      }
      onClose={onCancel}
      title={isEdit ? 'Edit category' : 'New category'}
    >
      <TextField
        error={errors.name}
        id="category-name"
        label="Name"
        maxLength={CATEGORY_NAME_MAX}
        onChange={setValue('name')}
        placeholder="Java basics"
        value={values.name}
      />
      <TextAreaField
        className="mt-5"
        error={errors.description}
        id="category-description"
        label="Description"
        maxLength={CATEGORY_DESCRIPTION_MAX}
        onChange={setValue('description')}
        placeholder="Short explanation of what belongs in this category"
        rows={3}
        value={values.description}
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
