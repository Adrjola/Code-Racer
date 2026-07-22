import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlobalRankingTable } from './GlobalRankingTable';
import type { GlobalRankingEntry } from '../types';

function entries(
  overrides: Partial<GlobalRankingEntry>[] = [],
): GlobalRankingEntry[] {
  const base: GlobalRankingEntry[] = [
    { cpm: 642, fastestTime: '0:17', rank: 1, username: 'zoomer' },
    { cpm: 631, fastestTime: '0:18', rank: 2, username: 'slower_zoomer' },
    { cpm: 631, fastestTime: '0:18', rank: 3, username: 'even_slower_zoomer' },
    { cpm: 631, fastestTime: '0:18', rank: 4, username: 'racer_1' },
  ];
  return base.map((entry, index) => ({ ...entry, ...overrides[index] }));
}

function rowFor(username: string) {
  return screen.getByText(username).closest('li') as HTMLLIElement;
}

describe('GlobalRankingTable row colors', () => {
  it('colors 1st place gold, 2nd/3rd pink, and the rest plain by default', () => {
    render(<GlobalRankingTable currentUsername="nobody" entries={entries()} />);

    expect(rowFor('zoomer').className).toContain('border-[#fbbf24]');
    expect(rowFor('slower_zoomer').className).toContain('border-[#f472b652]');
    expect(rowFor('even_slower_zoomer').className).toContain(
      'border-[#f472b652]',
    );
    expect(rowFor('racer_1').className).toContain('border-white/10');
  });

  it('keeps the gold tier for the current user at 1st place', () => {
    render(<GlobalRankingTable currentUsername="zoomer" entries={entries()} />);

    expect(rowFor('zoomer').className).toContain('border-[#fbbf24]');
    expect(rowFor('zoomer').className).not.toContain('border-[#a855f7');
  });

  it('keeps the pink tier for the current user at 2nd/3rd place', () => {
    render(
      <GlobalRankingTable
        currentUsername="slower_zoomer"
        entries={entries()}
      />,
    );

    expect(rowFor('slower_zoomer').className).toContain('border-[#f472b652]');
    expect(rowFor('slower_zoomer').className).not.toContain('border-[#a855f7');
  });

  it('colors the current user purple, never plain grey, outside the top 3', () => {
    render(
      <GlobalRankingTable currentUsername="racer_1" entries={entries()} />,
    );

    expect(rowFor('racer_1').className).toContain('border-[#a855f752]');
    expect(rowFor('racer_1').className).not.toContain('border-white/10');
    expect(rowFor('racer_1')).toHaveTextContent('YOU');
  });
});
