import logoChevronLeft from '../assets/icons/logo-chevron-left.svg';
import logoChevronRight from '../assets/icons/logo-chevron-right.svg';

export default function Logo() {
  return (
    <div className="brand-logo">
      <div className="brand-logo-mark">
        <div className="brand-logo-glow" />
        <span className="brand-logo-symbol" aria-hidden="true">
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
      <p className="brand-logo-wordmark">
        <span className="text-text-primary">Code</span>
        <span className="text-pink-400">Racer</span>
      </p>
    </div>
  );
}
