import LobbyModeButton from '@/features/lobby/components/LobbyModeButton';

type LobbyPageProps = {
  onOpenSolo: () => void;
};

export default function LobbyPage({ onOpenSolo }: LobbyPageProps) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-surface font-sans lg:h-[100dvh] lg:min-h-0 lg:w-screen lg:overflow-hidden">
      <div className="min-h-[100dvh] lg:fixed lg:left-0 lg:top-0 lg:h-[1080px] lg:min-h-0 lg:w-[1920px] lg:origin-top-left lg:[transform:scale(var(--page-scale))]">
        <main className="flex justify-center px-4 pb-6 pt-8 md:min-h-[100dvh] md:items-center md:px-[clamp(1rem,3vw,2.5rem)] md:pb-[clamp(1.75rem,5dvh,3.5rem)] md:pt-[clamp(5.5rem,10dvh,8rem)] lg:block lg:h-[1080px] lg:w-[1920px] lg:min-h-0 lg:p-0">
          <section className="flex w-[min(100%,37.5625rem)] flex-col items-center rounded-[16px] border border-[#2D2544] bg-[#0E0A1F]/85 px-[clamp(1.25rem,3.8vw,2.8125rem)] py-[clamp(1.75rem,4dvh,2.75rem)] text-white shadow-[0_30px_80px_-30px_rgba(219,39,119,0.45)] lg:absolute lg:left-1/2 lg:top-[254px] lg:w-[601px] lg:-translate-x-1/2 lg:px-[45px] lg:py-[40px]">
            <h1 className="text-center text-[clamp(1.75rem,1.35rem_+_1vw,2.5rem)] font-extrabold leading-[1.2] text-text-primary lg:text-[40px]">
              Lobby
            </h1>
            <div className="mt-[clamp(1.75rem,4.8dvh,3.125rem)] flex flex-col items-center gap-3 lg:mt-[49px]">
              <LobbyModeButton variant="secondary">Multiplayer</LobbyModeButton>
              <LobbyModeButton onClick={onOpenSolo} variant="primary">
                Singleplayer
              </LobbyModeButton>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
