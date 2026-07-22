import logoChevronLeft from '../assets/icons/logo-chevron-left.svg';
import logoChevronRight from '../assets/icons/logo-chevron-right.svg';

type LogoProps = {
  onClick?: () => void;
};

const wrapperClassName =
  'flex items-center gap-[clamp(0.55rem,0.58vw,0.6875rem)] lg:gap-[11px]';

export default function Logo({ onClick }: LogoProps) {
  const content = (
    <>
      <div className="relative flex h-[clamp(2rem,2.083vw,2.5rem)] w-[clamp(2rem,2.083vw,2.5rem)] items-center justify-center rounded-[clamp(0.45rem,0.469vw,0.5625rem)] bg-gradient-to-br from-pink-400 to-purple-500 lg:h-[40px] lg:w-[40px] lg:rounded-[9px]">
        <div className="absolute h-[85%] w-[85%] rounded-[inherit] shadow-[0_0_20px_-4px_rgb(219_39_119_/_0.8)]" />
        <span className="relative block h-[47.5%] w-[47.5%]" aria-hidden="true">
          <span className="absolute inset-[25%_66.67%_25%_12.5%]">
            <img
              alt=""
              className="absolute inset-[-10%_-24%] block max-w-none size-full"
              src={logoChevronLeft}
            />
          </span>
          <span className="absolute inset-[25%_12.5%_25%_66.67%]">
            <img
              alt=""
              className="absolute inset-[-10%_-24%] block max-w-none size-full"
              src={logoChevronRight}
            />
          </span>
        </span>
      </div>
      <p className="text-[clamp(0.8rem,0.833vw,1rem)] font-extrabold leading-[1.1] lg:text-[16px]">
        <span className="text-text-primary">Code</span>
        <span className="text-pink-400">Racer</span>
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label="Go to dashboard"
        className={wrapperClassName}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className={wrapperClassName}>{content}</div>;
}
