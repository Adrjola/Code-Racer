import { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import TextField from '@/components/TextField';
import type {
  Category,
  Difficulty,
  Snippet,
  SnippetValues,
} from '@/features/admin/api';
import {
  canonicalizeSource,
  hasFormErrors,
  SNIPPET_SOURCE_MAX,
  SNIPPET_TITLE_MAX,
  validateSnippet,
  type FormErrors,
} from '@/features/admin/validation';

type SnippetFormDialogProps = {
  categories: Category[];
  error?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: SnippetValues) => void;
  snippet?: Snippet;
};

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const difficultyOptions = DIFFICULTIES.map((difficulty) => ({
  label: `${difficulty.charAt(0)}${difficulty.slice(1).toLowerCase()}`,
  value: difficulty,
}));

/**
 * Repeats the backend's rule: only content, difficulty, or category changes
 * retire the current revision and create a new one. A title-only edit does not.
 */
function createsNewRevision(snippet: Snippet, values: SnippetValues): boolean {
  return (
    canonicalizeSource(values.source) !== snippet.source ||
    values.difficulty !== snippet.difficulty ||
    values.categoryId !== snippet.categoryId
  );
}

export default function SnippetFormDialog({
  categories,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
  snippet,
}: SnippetFormDialogProps) {
  const isEdit = snippet !== undefined;
  const [values, setValues] = useState<SnippetValues>({
    categoryId: snippet?.categoryId ?? '',
    difficulty: snippet?.difficulty ?? 'EASY',
    source: snippet?.source ?? '',
    title: snippet?.title ?? '',
  });
  const [errors, setErrors] = useState<FormErrors<SnippetValues>>({});
  const [isConfirmingRevision, setIsConfirmingRevision] = useState(false);

  // A disabled category cannot be chosen, but keep the one already on the snippet
  // so editing a snippet in a disabled category does not silently move it.
  const categoryOptions = categories
    .filter(
      (category) => category.active || category.id === snippet?.categoryId,
    )
    .map((category) => ({
      label: category.active ? category.name : `${category.name} (disabled)`,
      value: category.id,
    }));

  const setValue =
    <Field extends keyof SnippetValues>(field: Field) =>
    (value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const submit = (next: SnippetValues) => {
    onSubmit({
      categoryId: next.categoryId,
      difficulty: next.difficulty,
      source: canonicalizeSource(next.source),
      title: next.title.trim(),
    });
  };

  const handleSubmit = () => {
    const nextErrors = validateSnippet(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }

    if (snippet && createsNewRevision(snippet, values)) {
      setIsConfirmingRevision(true);
      return;
    }

    submit(values);
  };

  if (snippet && isConfirmingRevision) {
    return (
      <Modal
        description={`Revision ${snippet.revisionNumber} stays exactly as players raced it and is retired. Your changes are saved as revision ${snippet.revisionNumber + 1}, and new races use that one.`}
        onClose={onCancel}
        title="This creates a new revision"
      >
        <p className="text-sm leading-[1.5] text-text-secondary">
          You changed the code, difficulty, or category, so this is not an
          in-place edit. Results already recorded against revision{' '}
          {snippet.revisionNumber} keep pointing at it.
        </p>
        {error && (
          <p
            className="mt-4 rounded-[8px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            disabled={isSubmitting}
            onClick={() => setIsConfirmingRevision(false)}
            variant="ghost"
          >
            Back
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => submit(values)}
            variant="primary"
          >
            {isSubmitting
              ? 'Saving...'
              : `Create revision ${snippet.revisionNumber + 1}`}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      description={
        isEdit
          ? 'Changing the code, difficulty, or category creates a new revision. Renaming does not.'
          : 'Add a snippet for players to race against.'
      }
      onClose={onCancel}
      title={isEdit ? `Edit snippet` : 'New snippet'}
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
          error={errors.categoryId}
          id="snippet-category"
          label="Category"
          onChange={setValue('categoryId')}
          options={categoryOptions}
          placeholder="Select a category"
          value={values.categoryId}
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
