import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedToggle } from './SegmentedToggle';

describe('SegmentedToggle', () => {
  it('marks the current value as the selected tab', () => {
    render(
      <SegmentedToggle
        ariaLabel="Example"
        first={{ label: 'ONE', value: 'ONE' }}
        onChange={vi.fn()}
        second={{ label: 'TWO', value: 'TWO' }}
        value="ONE"
      />,
    );

    expect(screen.getByRole('tab', { name: 'ONE' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'TWO' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SegmentedToggle
        ariaLabel="Example"
        first={{ label: 'ONE', value: 'ONE' }}
        onChange={onChange}
        second={{ label: 'TWO', value: 'TWO' }}
        value="ONE"
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'TWO' }));

    expect(onChange).toHaveBeenCalledWith('TWO');
  });

  it('exposes an accessible tablist label', () => {
    render(
      <SegmentedToggle
        ariaLabel="Example"
        first={{ label: 'ONE', value: 'ONE' }}
        onChange={vi.fn()}
        second={{ label: 'TWO', value: 'TWO' }}
        value="ONE"
      />,
    );

    expect(
      screen.getByRole('tablist', { name: 'Example' }),
    ).toBeInTheDocument();
  });
});
