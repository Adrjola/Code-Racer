import Logo from '@/components/Logo';
import type { SoloSelection } from '@/features/solo/soloApi';

type SoloPreviewPageProps = {
  onBack: () => void;
  onLogout: () => void;
  selection: SoloSelection;
};

// Placeholder preview panel. The real snippet preview, refresh, Start action,
// and countdown are built in the next step.
export default function SoloPreviewPage({
  onBack,
  onLogout,
  selection,
}: SoloPreviewPageProps) {
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
              onClick={onBack}
              type="button"
            >
              Back
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
        <h1 className="font-mono text-2xl font-bold lg:text-3xl">Preview</h1>
        <p className="mt-4 text-text-secondary">
          {selection.categoryName} · {selection.difficulty}
        </p>
        <p className="mt-2 text-text-muted">
          The snippet preview and Start action are coming next.
        </p>
      </main>
    </div>
  );
}
