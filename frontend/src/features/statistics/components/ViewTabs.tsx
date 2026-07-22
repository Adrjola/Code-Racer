import { GlobeIcon, PersonalIcon } from '../icons';
import type { StatsView } from '../types';
import { SegmentedToggle } from './SegmentedToggle';

type ViewTabsProps = {
  onChange: (view: StatsView) => void;
  view: StatsView;
};

export function ViewTabs({ onChange, view }: ViewTabsProps) {
  return (
    <SegmentedToggle
      ariaLabel="Ranking scope"
      first={{ icon: <GlobeIcon />, label: 'GLOBAL', value: 'GLOBAL' }}
      onChange={onChange}
      second={{ icon: <PersonalIcon />, label: 'PERSONAL', value: 'PERSONAL' }}
      value={view}
    />
  );
}
