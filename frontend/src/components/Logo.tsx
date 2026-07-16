import logoChevronLeft from '../assets/icons/logo-chevron-left.svg';
import logoChevronRight from '../assets/icons/logo-chevron-right.svg';

export default function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      <div className="relative flex size-10 items-center justify-center rounded-[9px] bg-gradient-to-br from-pink-400 to-purple-500">
        <div className="absolute size-[34px] rounded-[9px] shadow-[0px_0px_20px_-4px_rgba(219,39,119,0.8)]" />
        <span className="relative block size-[19px]" aria-hidden="true">
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
      <p className="text-[16px] font-extrabold">
        <span className="text-text-primary">Code</span>
        <span className="text-pink-400">Racer</span>
      </p>
    </div>
  );
}
