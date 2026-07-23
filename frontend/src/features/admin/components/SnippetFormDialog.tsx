import { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import TextField from '@/components/TextField';
import type { Category, Difficulty, SnippetValues } from '@/features/admin/api';
import { CATEGORY_OPTIONS } from '@/features/admin/categories';
import {
  canonicalizeSource,
  hasFormErrors,
  SNIPPET_SOURCE_MAX,
  SNIPPET_TITLE_MAX,
  validateSnippet,
  type FormErrors,
} from '@/features/admin/validation';

type SnippetFormDialogProps = {
  error?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: SnippetValues) => void;
};

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const difficultyOptions = DIFFICULTIES.map((difficulty) => ({
  label: `${difficulty.charAt(0)}${difficulty.slice(1).toLowerCase()}`,
  value: difficulty,
}));

/** Snippets are immutable, so this only ever creates a new one. */
export default function SnippetFormDialog({
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}: SnippetFormDialogProps) {
  const [values, setValues] = useState<SnippetValues>({
    category: '',
    difficulty: 'EASY',
    source: '',
    title: '',
  });
  const [errors, setErrors] = useState<FormErrors<SnippetValues>>({});

  const categoryOptions = CATEGORY_OPTIONS.map((option) => ({
    label: option.displayName,
    value: option.category,
  }));

  const setValue =
    <Field extends keyof SnippetValues>(field: Field) =>
    (value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const handleSubmit = () => {
    const nextErrors = validateSnippet(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }

    onSubmit({
      category: values.category as Category,
      difficulty: values.difficulty,
      source: canonicalizeSource(values.source),
      title: values.title.trim(),
    });
  };

  return (
    <Modal
      description="Snippets cannot be edited once created. To change one, delete it and add a new snippet."
      onClose={onCancel}
      title="New snippet"
    >
      <TextField
        error={errors.title}
        id="snippet-title"
        label="Title"
        maxLength={SNIPPET_TITLE_MAX}
        onChange={setValue('title')}
        placeholder="FizzBuzz"
        value={values.title}
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SelectField
          id="snippet-difficulty"
          label="Difficulty"
          onChange={setValue('difficulty')}
          options={difficultyOptions}
          value={values.difficulty}
        />
        <SelectField
          error={errors.category}
          id="snippet-category"
          label="Category"
          onChange={setValue('category')}
          options={categoryOptions}
          placeholder="Select a category"
          value={values.category}
        />
      </div>
      <TextAreaField
        className="mt-5"
        error={errors.source}
        hint="Line endings are normalized. Whitespace is part of what players type."
        id="snippet-source"
        label="Code"
        maxLength={SNIPPET_SOURCE_MAX}
        onChange={setValue('source')}
        placeholder={'public int sumEven(int[] nums) {\n  ...\n}'}
        rows={10}
        spellCheck={false}
        value={values.source}
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
