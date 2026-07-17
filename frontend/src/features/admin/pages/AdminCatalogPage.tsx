import { useState } from 'react';
import CategoriesPage from './CategoriesPage';
import SnippetsPage from './SnippetsPage';

type Tab = 'categories' | 'snippets';

const tabClassName =
  'rounded-[8px] px-3 py-2 text-sm font-semibold transition duration-150 ease-out';

const activeTabClassName = 'bg-pink-400/15 text-pink-200';
const inactiveTabClassName = 'text-text-secondary hover:text-text-primary';

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('categories');

  const tabButton = (value: Tab, label: string) => (
    <button
      aria-selected={tab === value}
      className={`${tabClassName} ${
        tab === value ? activeTabClassName : inactiveTabClassName
      }`}
      onClick={() => setTab(value)}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-1" role="tablist">
        {tabButton('categories', 'Categories')}
        {tabButton('snippets', 'Snippets')}
      </div>
      <div className="mt-6">
        {tab === 'categories' ? <CategoriesPage /> : <SnippetsPage />}
      </div>
    </div>
  );
}
