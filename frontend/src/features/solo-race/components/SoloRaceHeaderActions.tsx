import restartArrow from '../../../assets/restart-arrow.svg';

interface SoloRaceHeaderActionsProps {
  onRestart: () => void;
  onLobby: () => void;
}

export function SoloRaceHeaderActions({ onRestart, onLobby }: SoloRaceHeaderActionsProps) {
  return (
    <div className="flex items-center gap-6">
      <button
        className="inline-flex h-[37px] cursor-pointer items-center rounded-[9px] border border-[#F472B647] bg-[#F472B60F] px-[18px] text-sm font-semibold leading-none text-[#E7E5EF] transition hover:bg-[#F472B626] hover:border-[#F472B680] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08051A] active:scale-[0.98]"
        onClick={onRestart}
        type="button"
      >
        <img alt="" aria-hidden="true" className="mr-1 h-[14px] w-[14px]" src={restartArrow} />
        <span>Restart</span>
      </button>
      <button
        className="inline-flex h-[37px] cursor-pointer items-center justify-center rounded-[9px] bg-[linear-gradient(107.27deg,#F472B6_0%,#A855F7_100%)] px-[18px] text-sm font-bold leading-none text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F9A8D4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08051A] active:scale-[0.98]"
        onClick={onLobby}
        type="button"
      >
        Lobby
      </button>
    </div>
  );
}
