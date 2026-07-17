import lockBody from '../assets/icons/lock-body.svg';
import lockShackle from '../assets/icons/lock-shackle.svg';
import logoChevronRight from '../assets/icons/logo-chevron-right.svg';
import mail from '../assets/icons/mail.svg';
import userBody from '../assets/icons/user-body.svg';
import userHead from '../assets/icons/user-head.svg';

export function UserIcon() {
  return (
    <span className="relative block h-4 w-4 shrink-0" aria-hidden="true">
      <span className="absolute inset-[62.5%_20.83%_12.5%_20.83%]">
        <img
          alt=""
          className="absolute inset-[-16.67%_-7.14%_0_-7.14%] block max-w-none size-full"
          src={userBody}
        />
      </span>
      <span className="absolute inset-[12.5%_33.33%_54.17%_33.33%]">
        <img
          alt=""
          className="absolute inset-[-12.5%] block max-w-none size-full"
          src={userHead}
        />
      </span>
    </span>
  );
}

export function LockIcon() {
  return (
    <span className="relative block h-4 w-4 shrink-0" aria-hidden="true">
      <span className="absolute inset-[45.83%_12.5%_8.33%_12.5%]">
        <img
          alt=""
          className="absolute inset-[-9.09%_-5.56%] block max-w-none size-full"
          src={lockBody}
        />
      </span>
      <span className="absolute inset-[8.33%_29.17%_54.17%_29.17%]">
        <img
          alt=""
          className="absolute inset-[-11.11%_-10%_0_-10%] block max-w-none size-full"
          src={lockShackle}
        />
      </span>
    </span>
  );
}

export function MailIcon() {
  return (
    <span
      className="relative block h-[0.6875rem] w-[0.9375rem] shrink-0"
      aria-hidden="true"
    >
      <span className="absolute inset-[-4.55%_-3.33%]">
        <img alt="" className="block max-w-none size-full" src={mail} />
      </span>
    </span>
  );
}

export function ChevronRightIcon({
  className = 'h-3.5 w-2',
}: { className?: string } = {}) {
  return (
    <span className={`relative block shrink-0 ${className}`} aria-hidden="true">
      <img
        alt=""
        className="absolute inset-0 block h-full w-full max-w-none"
        src={logoChevronRight}
      />
    </span>
  );
}

type ModeIconProps = {
  className?: string;
};

export function PersonIcon({ className = 'size-6' }: ModeIconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={`${className} text-white`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="8" fill="currentColor" r="3.5" />
      <path
        d="M4.5 20c0-4.142 3.358-7 7.5-7s7.5 2.858 7.5 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PeopleIcon({ className = 'size-6' }: ModeIconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={`${className} text-white`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="8" fill="currentColor" r="3" />
      <circle cx="16" cy="9" fill="currentColor" opacity="0.85" r="2.5" />
      <path
        d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M14.5 14.2c2.6.3 4.5 2.3 4.5 5.3"
        opacity="0.85"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
