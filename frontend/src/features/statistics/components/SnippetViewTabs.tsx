import type { SnippetView } from '../types';
import { SegmentedToggle } from './SegmentedToggle';

type SnippetViewTabsProps = {
  onChange: (view: SnippetView) => void;
  view: SnippetView;
};

export function SnippetViewTabs({ onChange, view }: SnippetViewTabsProps) {
  return (
    <SegmentedToggle
      ariaLabel="Snippet log view"
      first={{ label: 'BEST', value: 'BEST' }}
      onChange={onChange}
      second={{ label: 'HISTORY', value: 'HISTORY' }}
      value={view}
    />
  );
}
