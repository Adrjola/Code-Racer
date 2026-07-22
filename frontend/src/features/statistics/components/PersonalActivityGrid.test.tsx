import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonalActivityGrid } from './PersonalActivityGrid';
import type { PersonalActivityEntry } from '../types';

const entries: PersonalActivityEntry[] = [
  {
    category: 'JAVA',
    cpm: 452,
    id: 'snippet-1',
    relativeTime: '5 min ago',
    snippetName: 'Two Sum',
    time: '0:41:221',
  },
  {
    category: 'SQL',
    cpm: 438,
    id: 'snippet-2',
    relativeTime: '2 hrs ago',
    snippetName: 'Group By Count',
    time: '0:41:221',
  },
];

describe('PersonalActivityGrid', () => {
  it('renders one card per entry with its category, name, cpm, and time', () => {
    render(<PersonalActivityGrid entries={entries} />);

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);

    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('JAVA')).toBeInTheDocument();
    expect(screen.getByText('452')).toBeInTheDocument();

    expect(screen.getByText('Group By Count')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
    expect(screen.getByText('438')).toBeInTheDocument();
  });

  it('falls back to the default icon for an unrecognized category', () => {
    render(
      <PersonalActivityGrid
        entries={[
          {
            category: 'RUST',
            cpm: 300,
            id: 'snippet-3',
            relativeTime: '1 day ago',
            snippetName: 'Ownership Basics',
            time: '1:00:000',
          },
        ]}
      />,
    );

    expect(screen.getByText('Ownership Basics')).toBeInTheDocument();
    expect(screen.getByText('RUST')).toBeInTheDocument();
  });
});
