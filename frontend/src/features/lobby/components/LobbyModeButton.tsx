type LobbyModeButtonProps = {
  children: string;
  onClick?: () => void;
  variant: 'primary' | 'secondary';
};

const BASE_BUTTON_CLASSNAME =
  'rounded-[9px] px-5 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70';

const VARIANT_CLASSNAME: Record<LobbyModeButtonProps['variant'], string> = {
  primary:
    'bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:brightness-110',
  secondary: 'border border-pink-400/40 text-pink-200 hover:bg-pink-500/10',
};

export default function LobbyModeButton({
  children,
  onClick,
  variant,
}: LobbyModeButtonProps) {
  return (
    <button
      className={`${BASE_BUTTON_CLASSNAME} ${VARIANT_CLASSNAME[variant]}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
