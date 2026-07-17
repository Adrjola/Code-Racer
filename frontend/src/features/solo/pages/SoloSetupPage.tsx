import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import {
  fetchCategories,
  isSessionExpiredError,
  readableSoloError,
  type Category,
  type Difficulty,
  type SoloSelection,
} from '@/features/solo/soloApi';

type SoloSetupPageProps = {
  onGoDashboard: () => void;
  onLogout: () => void;
  onSelect: (selection: SoloSelection) => void;
  onSessionExpired: () => void;
};

type CategoriesState =
  | { message: string; status: 'error' }
  | { categories: Category[]; status: 'ready' }
  | { status: 'loading' };

const DIFFICULTIES: {
  className: string;
  value: Difficulty;
}[] = [
  {
    className:
      'border-emerald-500/50 bg-emerald-950/40 hover:border-emerald-400',
    value: 'EASY',
  },
  {
    className: 'border-amber-500/50 bg-amber-950/40 hover:border-amber-400',
    value: 'MEDIUM',
  },
  {
    className: 'border-pink-500/50 bg-pink-950/40 hover:border-pink-400',
    value: 'HARD',
  },
];

const headingClassName = 'font-mono text-2xl font-bold lg:text-3xl';

const categoryButtonBaseClassName =
  'flex h-[4.75rem] w-full shrink-0 items-center justify-center rounded-xl border px-4 text-center font-mono text-lg font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50';

const categoryButtonIdleClassName =
  'border-pink-400/25 bg-[rgb(40_20_35_/_0.35)] text-text-primary hover:border-pink-400/60';

const categoryButtonSelectedClassName =
  'border-pink-400 bg-pink-500/15 text-white ring-1 ring-pink-400/40';

const difficultyButtonBaseClassName =
  'flex h-[9rem] w-full items-center justify-center rounded-xl border font-mono text-2xl font-semibold text-text-primary transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-inherit sm:w-72 lg:h-40 lg:text-3xl';

export default function SoloSetupPage({
  onGoDashboard,
  onLogout,
  onSelect,
  onSessionExpired,
}: SoloSetupPageProps) {
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined);

  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((categories) => {
        if (!cancelled) {
          setState({ categories, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (isSessionExpiredError(error)) {
          onSessionExpiredRef.current();
          return;
        }
        setState({ message: readableSoloError(error), status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retry = () => {
    setState({ status: 'loading' });
    setReloadToken((token) => token + 1);
  };

  const categories = state.status === 'ready' ? state.categories : [];
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  const handleDifficulty = (difficulty: Difficulty) => {
    if (!selectedCategory) {
      return;
    }
    onSelect({
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      difficulty,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      <header className="border-b border-pink-400/15 px-[clamp(1rem,5vw,2.5rem)] py-[clamp(0.875rem,1.9dvh,1.5rem)]">
        <div className="mx-auto flex w-full max-w-[100rem] flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <nav
            aria-label="Primary navigation"
            className="flex flex-wrap items-center justify-start gap-3 md:justify-end"
          >
            <button
              className="text-sm font-semibold text-text-secondary hover:text-text-primary"
              onClick={onGoDashboard}
              type="button"
            >
              Dashboard
            </button>
            <button
              className="rounded-[8px] border border-pink-400/30 px-3 py-2 text-sm font-semibold text-pink-300"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[100rem] px-[clamp(1rem,5vw,2.5rem)] py-[clamp(2rem,5dvh,3.5rem)]">
        <section aria-labelledby="category-heading">
          <h1 className={headingClassName} id="category-heading">
            Category
          </h1>

          {state.status === 'loading' && (
            <p className="mt-6 text-text-secondary" role="status">
              Loading categories...
            </p>
          )}

          {state.status === 'error' && (
            <div className="mt-6" role="alert">
              <p className="text-text-secondary">{state.message}</p>
              <button
                className="mt-3 rounded-[8px] border border-pink-400/40 px-4 py-2 text-sm font-semibold text-pink-300 hover:border-pink-400"
                onClick={retry}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {state.status === 'ready' && categories.length === 0 && (
            <p className="mt-6 text-text-secondary" role="status">
              No categories are available right now.
            </p>
          )}

          {state.status === 'ready' && categories.length > 0 && (
            <ul
              aria-label="Categories"
              className="mt-6 flex max-h-[15.75rem] w-full max-w-72 flex-col gap-3 overflow-y-auto pr-1"
            >
              {categories.map((category) => {
                const isSelected = category.id === selectedCategoryId;
                return (
                  <li key={category.id}>
                    <button
                      aria-pressed={isSelected}
                      className={`${categoryButtonBaseClassName} ${
                        isSelected
                          ? categoryButtonSelectedClassName
                          : categoryButtonIdleClassName
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="difficulty-heading" className="mt-12">
          <h2 className={headingClassName} id="difficulty-heading">
            Difficulty
          </h2>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:flex-wrap">
            {DIFFICULTIES.map((difficulty) => (
              <button
                className={`${difficultyButtonBaseClassName} ${difficulty.className}`}
                disabled={!selectedCategory}
                key={difficulty.value}
                onClick={() => handleDifficulty(difficulty.value)}
                type="button"
              >
                {difficulty.value}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-text-muted" role="status">
            {selectedCategory
              ? `Pick a difficulty to start a ${selectedCategory.name} race.`
              : 'Select a category first, then choose a difficulty.'}
          </p>
        </section>
      </main>
    </div>
  );
}
