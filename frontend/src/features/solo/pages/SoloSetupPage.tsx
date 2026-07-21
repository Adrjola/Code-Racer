import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Logo from '@/components/Logo';
import { TrophyIcon } from '@/components/icons';
import type { AuthSession } from '@/features/auth/session';
import {
  fetchCategories,
  isSessionExpiredError,
  readableSoloError,
  type Category,
  type Difficulty,
  type SoloSelection,
} from '@/features/solo/api/soloApi';
import categoryJavaGlyph from '@/assets/icons/category-java-glyph.svg';
import categoryRestApisGlyph from '@/assets/icons/category-rest-apis-glyph.svg';
import categorySqlGlyph from '@/assets/icons/category-sql-glyph.svg';
import categoryTestingGlyph from '@/assets/icons/category-testing-glyph.svg';
import checkmarkIcon from '@/assets/icons/checkmark.svg';
import playTriangleIcon from '@/assets/icons/play-triangle.svg';

type SoloSetupPageProps = {
  onGoDashboard: () => void;
  onLogout: () => void;
  onSelect: (selection: SoloSelection) => void;
  onSessionExpired: () => void;
  session: AuthSession;
};

type CategoriesState =
  | { message: string; status: 'error' }
  | { categories: Category[]; status: 'ready' }
  | { status: 'loading' };

type DifficultyOption = {
  label: string;
  subtext: string;
  tone: string;
  value: Difficulty;
};

const DIFFICULTIES: DifficultyOption[] = [
  {
    label: 'BABY MODE',
    subtext: 'TRAINING WHEELS ON · NO SHAME',
    tone: '#34d399',
    value: 'EASY',
  },
  {
    label: 'TRYHARD',
    subtext: 'OKAY, SHOW OFF.',
    tone: '#fbbf24',
    value: 'MEDIUM',
  },
  {
    label: 'LOCKED IN',
    subtext: 'TOUCH GRASS LATER · DENSE LOGIC',
    tone: '#f472b6',
    value: 'HARD',
  },
];

const CATEGORY_GLYPH: Record<string, { className: string; src: string }> = {
  JAVA: { className: 'h-12 w-[53px]', src: categoryJavaGlyph },
  'REST APIS': { className: 'h-11 w-[51px]', src: categoryRestApisGlyph },
  SQL: { className: 'h-10 w-9', src: categorySqlGlyph },
  TESTING: { className: 'h-11 w-10', src: categoryTestingGlyph },
};

function Checkbox({ checked, tone }: { checked: boolean; tone: string }) {
  if (!checked) {
    return (
      <span
        aria-hidden="true"
        className="size-6 shrink-0 rounded-[7px] border border-white/16"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-[7px]"
      style={{ backgroundColor: tone }}
    >
      <img alt="" className="size-3" src={checkmarkIcon} />
    </span>
  );
}

type CategoryCardProps = {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
};

function CategoryCard({ category, isSelected, onSelect }: CategoryCardProps) {
  const glyph = CATEGORY_GLYPH[category.name.toUpperCase()];

  return (
    <li>
      <button
        aria-pressed={isSelected}
        className={`relative flex h-[132px] w-full flex-col justify-between overflow-hidden rounded-2xl border px-6 py-5 text-left transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 ${
          isSelected
            ? 'border-[#c084fcE6] bg-gradient-to-b from-[#a855f73d] to-[#7e34d61f]'
            : 'border-[#a855f747] bg-[#0a09109c] hover:border-[#a855f780]'
        }`}
        onClick={onSelect}
        type="button"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-4"
          style={{ opacity: isSelected ? 0.22 : 0.08 }}
        >
          {glyph ? (
            <img alt="" className={glyph.className} src={glyph.src} />
          ) : (
            <span className="font-mono text-[56px] font-bold leading-none text-[#a855f7]">
              {'{}'}
            </span>
          )}
        </span>
        <div className="flex items-start justify-between gap-3">
          <span
            className={`font-mono text-[28px] font-bold leading-none ${
              isSelected ? 'text-white' : 'text-[#b9a9d0]'
            }`}
          >
            {category.name}
          </span>
          <Checkbox checked={isSelected} tone="#c084fc" />
        </div>
        <span
          className={`font-mono text-xs ${
            isSelected ? 'text-[#c084fc]' : 'text-[#5f5570]'
          }`}
        >
          {category.description}
        </span>
      </button>
    </li>
  );
}

type DifficultyCardProps = {
  disabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  option: DifficultyOption;
};

function DifficultyCard({
  disabled,
  isSelected,
  onSelect,
  option,
}: DifficultyCardProps) {
  return (
    <li>
      <button
        aria-pressed={isSelected}
        className={`flex h-[132px] w-full flex-col justify-between rounded-2xl border px-6 py-5 text-left transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-40 ${
          isSelected
            ? 'bg-gradient-to-b from-[#0000] to-[#0a091090]'
            : 'border-white/12 bg-[#0a09109c]'
        }`}
        disabled={disabled}
        onClick={onSelect}
        style={
          isSelected
            ? {
                borderColor: option.tone,
                backgroundImage: `linear-gradient(to bottom, ${option.tone}33, #0a091090)`,
              }
            : undefined
        }
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: option.tone }}
            />
            <span
              className={`font-mono text-[28px] font-bold leading-none ${
                isSelected ? 'text-white' : 'text-[#8589a3]'
              }`}
            >
              {option.label}
            </span>
          </span>
          <Checkbox checked={isSelected} tone={option.tone} />
        </div>
        <span
          className="font-mono text-xs"
          style={{ color: isSelected ? option.tone : '#5b5f78' }}
        >
          {option.subtext}
        </span>
      </button>
    </li>
  );
}

function useNaturalHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setHeight(node.offsetHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { height, ref };
}

export default function SoloSetupPage({
  onGoDashboard,
  onLogout,
  onSelect,
  onSessionExpired,
  session,
}: SoloSetupPageProps) {
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Difficulty | undefined
  >(undefined);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [designWidth] = useState(() => window.innerWidth);
  const [scale, setScale] = useState(1);
  const { height: headerHeight, ref: headerCanvasRef } = useNaturalHeight();
  const { height: mainHeight, ref: mainCanvasRef } = useNaturalHeight();

  useEffect(() => {
    function updateScale() {
      setScale(window.innerWidth / designWidth);
    }
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [designWidth]);

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
  const selectedDifficultyOption = DIFFICULTIES.find(
    (option) => option.value === selectedDifficulty,
  );
  const canPlay = Boolean(selectedCategory && selectedDifficultyOption);

  const handlePlay = () => {
    if (!selectedCategory || !selectedDifficultyOption) {
      return;
    }
    onSelect({
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      difficulty: selectedDifficultyOption.value,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-surface font-sans text-text-primary">
      <div
        className="sticky top-0 z-10 bg-surface lg:overflow-hidden lg:[height:calc(var(--solo-header-h)*var(--solo-scale))]"
        style={
          {
            '--solo-header-h': `${headerHeight}px`,
            '--solo-scale': scale,
          } as CSSProperties
        }
      >
        <div
          className="lg:[width:var(--solo-design-w)] lg:origin-top-left lg:[transform:scale(var(--solo-scale))]"
          ref={headerCanvasRef}
          style={{ '--solo-design-w': `${designWidth}px` } as CSSProperties}
        >
          <header className="flex items-center justify-between gap-4 px-[clamp(1rem,5vw,2.5rem)] py-6 lg:px-[40px]">
            <Logo onClick={onGoDashboard} />
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-[9px] border border-[rgba(251,191,36,0.34)] bg-[rgba(251,191,36,0.08)]"
              >
                <TrophyIcon className="size-5" />
              </span>
              <span className="hidden h-10 items-center gap-2 rounded-[9px] border border-[rgba(244,114,182,0.2)] bg-[rgba(244,114,182,0.05)] px-3 font-mono text-[10.5px] tracking-wide sm:flex">
                <span className="text-[#6b6f85]">USER:</span>
                <span className="font-bold text-[#f9a8d4]">
                  {session.user.username}
                </span>
              </span>
              <div className="relative">
                <button
                  aria-expanded={isMenuOpen}
                  aria-label="Menu"
                  className="flex size-10 flex-col items-center justify-center gap-1 rounded-[9px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)]"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  type="button"
                >
                  <span className="h-[2px] w-[18px] rounded-full bg-[#c9cbe0]" />
                  <span className="h-[2px] w-[18px] rounded-full bg-[#c9cbe0]" />
                  <span className="h-[2px] w-[9.59px] rounded-full bg-[#c9cbe0]" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-12 z-10 flex w-40 flex-col overflow-hidden rounded-[9px] border border-white/10 bg-[#15121f] py-1 shadow-lg">
                    <button
                      className="px-4 py-2 text-left text-sm font-semibold text-pink-300 hover:bg-white/5"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      type="button"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>
      </div>

      <div
        className="lg:overflow-hidden lg:[height:calc(var(--solo-main-h)*var(--solo-scale))]"
        style={
          {
            '--solo-main-h': `${mainHeight}px`,
            '--solo-scale': scale,
          } as CSSProperties
        }
      >
        <main
          className="mx-auto w-full max-w-[100rem] px-[clamp(1rem,5vw,2.5rem)] pb-8 pt-6 lg:mx-0 lg:max-w-none lg:px-[80px] lg:pt-16 lg:origin-top-left lg:[width:var(--solo-design-w)] lg:[transform:scale(var(--solo-scale))]"
          ref={mainCanvasRef}
          style={{ '--solo-design-w': `${designWidth}px` } as CSSProperties}
        >
          <section aria-labelledby="category-heading">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1
                className="font-sans text-3xl font-bold text-white lg:text-[32px]"
                id="category-heading"
              >
                Category
              </h1>
              <p className="font-mono text-xs text-[#a855f7]">
                {'// PICK YOUR POISON'}
              </p>
            </div>

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
                className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {categories.map((category) => (
                  <CategoryCard
                    category={category}
                    isSelected={category.id === selectedCategoryId}
                    key={category.id}
                    onSelect={() => setSelectedCategoryId(category.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="difficulty-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2
                className="font-sans text-3xl font-bold text-white lg:text-[32px]"
                id="difficulty-heading"
              >
                Difficulty
              </h2>
              <p className="font-mono text-[11px] text-[#a855f7]">
                {'// HOW HUMBLED DO YOU WANT TO BE'}
              </p>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {DIFFICULTIES.map((option) => (
                <DifficultyCard
                  disabled={!selectedCategory}
                  isSelected={option.value === selectedDifficulty}
                  key={option.value}
                  onSelect={() => setSelectedDifficulty(option.value)}
                  option={option}
                />
              ))}
            </ul>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <button
              className="flex h-[88px] w-48 items-center justify-center gap-3 rounded-[10px] font-sans text-2xl font-bold text-white transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canPlay}
              onClick={handlePlay}
              style={
                canPlay
                  ? {
                      backgroundImage:
                        'linear-gradient(106deg, #f472b6 0%, #a855f7 100%)',
                      boxShadow: '0px 0px 28px -6px rgba(219,39,119,0.85)',
                    }
                  : { backgroundColor: 'rgba(255,255,255,0.05)' }
              }
              type="button"
            >
              <img alt="" className="h-6 w-[17px]" src={playTriangleIcon} />
              Play
            </button>

            <div>
              <p className="font-mono text-xs text-[#5b5f78]">LOADOUT</p>
              <p className="font-mono text-base text-[#c9c7d6]">
                {selectedCategory && selectedDifficultyOption
                  ? `${selectedCategory.name.toUpperCase()} - ${selectedDifficultyOption.label}`
                  : 'Select a category and difficulty'}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
