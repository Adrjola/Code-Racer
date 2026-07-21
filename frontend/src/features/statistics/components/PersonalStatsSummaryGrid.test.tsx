import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonalStatsSummaryGrid } from './PersonalStatsSummaryGrid';
import type { PersonalStatsSummary } from '../types';

const summary: PersonalStatsSummary = {
  averageCpm: 122,
  averageTime: '0:55:102',
  fastestCpm: 122,
  fastestTime: '0:41.201',
};

describe('PersonalStatsSummaryGrid', () => {
  it('renders fastest and average time/cpm cards', () => {
    render(<PersonalStatsSummaryGrid summary={summary} />);

    expect(screen.getByText('Fastest Time')).toBeInTheDocument();
    expect(screen.getByText('0:41.201')).toBeInTheDocument();
    expect(screen.getByText('Average Time')).toBeInTheDocument();
    expect(screen.getByText('0:55:102')).toBeInTheDocument();
    expect(screen.getByText('Fastest CPM')).toBeInTheDocument();
    expect(screen.getByText('Average CPM')).toBeInTheDocument();
    expect(screen.getAllByText('122')).toHaveLength(2);
  });
});
