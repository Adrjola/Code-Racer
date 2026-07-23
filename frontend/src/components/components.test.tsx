import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Badge from './Badge';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';
import Header from './Header';
import Modal from './Modal';
import Pagination from './Pagination';
import SelectField from './SelectField';
import TextAreaField from './TextAreaField';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge tone="positive">Active</Badge>);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Edit</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Edit
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('labels the dialog with its title and description', () => {
    render(
      <Modal description="Pick a name" onClose={vi.fn()} title="New category">
        <p>Body</p>
      </Modal>,
    );

    expect(
      screen.getByRole('dialog', { name: 'New category' }),
    ).toHaveAccessibleDescription('Pick a name');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} title="New category">
        <p>Body</p>
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the backdrop is clicked but not the panel', async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} title="New category">
        <p>Body</p>
      </Modal>,
    );

    await userEvent.click(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(document.querySelector('.fixed') as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves focus to the dialog when it opens', () => {
    render(
      <Modal onClose={vi.fn()} title="New category">
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});

describe('Modal close button', () => {
  it('closes from the visible close control, not just the backdrop', async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} title="Count Vowels">
        <p>body</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ConfirmDialog', () => {
  it('confirms and cancels', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        confirmLabel="Disable"
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Disable category"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(onConfirm).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows an error and blocks both actions while submitting', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        confirmLabel="Disable"
        error="Category is already disabled"
        isSubmitting
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        title="Disable category"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Category is already disabled',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Working...' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('reports the human-readable position', () => {
    render(
      <Pagination
        onPageChange={vi.fn()}
        page={1}
        totalElements={42}
        totalPages={3}
      />,
    );

    expect(screen.getByText(/Page 2 of 3 - 42 total/)).toBeInTheDocument();
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(
      <Pagination
        onPageChange={vi.fn()}
        page={0}
        totalElements={42}
        totalPages={3}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    rerender(
      <Pagination
        onPageChange={vi.fn()}
        page={2}
        totalElements={42}
        totalPages={3}
      />,
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('steps through pages', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        onPageChange={onPageChange}
        page={1}
        totalElements={42}
        totalPages={3}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});

describe('SelectField', () => {
  it('reports the chosen value', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        id="difficulty"
        label="Difficulty"
        onChange={onChange}
        options={[
          { label: 'Easy', value: 'EASY' },
          { label: 'Hard', value: 'HARD' },
        ]}
        placeholder="All difficulties"
        value=""
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Difficulty'), 'HARD');

    expect(onChange).toHaveBeenCalledWith('HARD');
  });

  it('links its error to the control for screen readers', () => {
    render(
      <SelectField
        error="Category is required"
        id="category"
        label="Category"
        onChange={vi.fn()}
        options={[]}
        value=""
      />,
    );

    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription(
      'Category is required',
    );
    expect(screen.getByLabelText('Category')).toBeInvalid();
  });
});

describe('TextAreaField', () => {
  it('reports typed text', async () => {
    const onChange = vi.fn();
    render(
      <TextAreaField id="source" label="Source" onChange={onChange} value="" />,
    );

    await userEvent.type(screen.getByLabelText('Source'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('exposes its hint as the accessible description', () => {
    render(
      <TextAreaField
        hint="Whitespace is normalized"
        id="source"
        label="Source"
        onChange={vi.fn()}
        value=""
      />,
    );

    expect(screen.getByLabelText('Source')).toHaveAccessibleDescription(
      'Whitespace is normalized',
    );
  });
});

describe('Header scale', () => {
  it('sizes the logo the same on an overlay page and a flow page', () => {
    const overlay = render(<Header layout="overlay" variant="minimal" />);
    const overlayLogo = overlay.container.querySelector('header p')?.className;
    overlay.unmount();

    const flow = render(<Header variant="minimal" />);
    const flowLogo = flow.container.querySelector('header p')?.className;

    // Same component, same classes: the size can only differ via the scale, and
    // both layouts now derive that from window width alone.
    expect(flowLogo).toBe(overlayLogo);
  });
});
