import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnimatedBackground from './AnimatedBackground';

describe('AnimatedBackground', () => {
  it('renders a decorative svg hidden from assistive tech', () => {
    const { container } = render(<AnimatedBackground />);

    const svg = container.querySelector('#landing-bg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the passed className to the svg', () => {
    const { container } = render(<AnimatedBackground className="custom-bg" />);

    expect(container.querySelector('#landing-bg')).toHaveClass('custom-bg');
  });
});
