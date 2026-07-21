import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RaceBot from './RaceBot';

describe('RaceBot', () => {
  it('renders a hidden mount element without crashing (no WebGL under jsdom)', () => {
    const { container } = render(<RaceBot />);

    const mount = container.firstElementChild;
    expect(mount).toBeInTheDocument();
    expect(mount).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the passed className', () => {
    const { container } = render(<RaceBot className="h-full w-full" />);

    expect(container.firstElementChild).toHaveClass('h-full', 'w-full');
  });

  it('accepts a pointTargetRef and custom camera props without crashing', () => {
    const pointTargetRef = createRef<HTMLButtonElement>();

    expect(() =>
      render(
        <RaceBot
          cameraPosition={[0, 0.5, 1.7]}
          cameraTarget={[0, 0.56, 0]}
          pointTargetRef={pointTargetRef}
        />,
      ),
    ).not.toThrow();
  });

  it('re-renders with different camera props without crashing', () => {
    const { rerender } = render(
      <RaceBot cameraPosition={[0, 0.58, 2.17]} cameraTarget={[0, 0.45, 0]} />,
    );

    expect(() =>
      rerender(
        <RaceBot cameraPosition={[0, 0.5, 1.7]} cameraTarget={[0, 0.56, 0]} />,
      ),
    ).not.toThrow();
  });

  it('unmounts cleanly', () => {
    const { unmount } = render(<RaceBot />);

    expect(() => unmount()).not.toThrow();
  });
});
