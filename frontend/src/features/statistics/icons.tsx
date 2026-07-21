import trophyBase from '@/assets/icons/trophy-base.svg';
import trophyCup from '@/assets/icons/trophy-cup.svg';
import trophyHandles from '@/assets/icons/trophy-handles.svg';

type IconProps = {
  className?: string;
};

export function TrophyIcon({ className = 'size-5' }: IconProps = {}) {
  return (
    <span className={`relative block shrink-0 ${className}`} aria-hidden="true">
      <span className="absolute inset-[16.67%_29.17%_45.83%_29.17%]">
        <img
          alt=""
          className="absolute inset-[-8.33%_-7.5%] block max-w-none size-full"
          src={trophyCup}
        />
      </span>
      <span className="absolute inset-[20.83%_16.67%_58.33%_16.67%]">
        <img
          alt=""
          className="absolute inset-[-15%_-4.69%] block max-w-none size-full"
          src={trophyHandles}
        />
      </span>
      <span className="absolute inset-[56.25%_33.33%_16.67%_33.33%]">
        <img
          alt=""
          className="absolute inset-[-11.54%_-9.38%] block max-w-none size-full"
          src={trophyBase}
        />
      </span>
    </span>
  );
}

export function GlobeIcon({ className = 'size-3' }: IconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 12 12"
    >
      <path
        d="M6 11.5C9.03757 11.5 11.5 9.03757 11.5 6C11.5 2.96243 9.03757 0.5 6 0.5C2.96243 0.5 0.5 2.96243 0.5 6C0.5 9.03757 2.96243 11.5 6 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.805613 4.16667H11.1945M0.805613 7.83333H11.1945M6.00006 0.5C7.29329 2.04093 8.00218 3.9883 8.00218 6C8.00218 8.0117 7.29329 9.95907 6.00006 11.5C4.70682 9.95907 3.99794 8.0117 3.99794 6C3.99794 3.9883 4.70682 2.04093 6.00006 0.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonalIcon({ className = 'size-3' }: IconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 11.24 12.2401"
    >
      <path
        d="M5.61992 5.47714C6.96119 5.47714 8.04849 4.38983 8.04849 3.04857C8.04849 1.70731 6.96119 0.62 5.61992 0.62C4.27866 0.62 3.19135 1.70731 3.19135 3.04857C3.19135 4.38983 4.27866 5.47714 5.61992 5.47714Z"
        stroke="currentColor"
        strokeWidth="1.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.62 11.6201C0.62 8.83437 2.83429 7.04866 5.62 7.04866C8.40571 7.04866 10.62 8.83437 10.62 11.6201"
        stroke="currentColor"
        strokeWidth="1.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StopwatchIcon({ className = 'size-5' }: IconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 19 21.5"
    >
      <path
        d="M9.5 20.75C14.3325 20.75 18.25 17.019 18.25 12.4166C18.25 7.81414 14.3325 4.08313 9.5 4.08313C4.66751 4.08313 0.75 7.81414 0.75 12.4166C0.75 17.019 4.66751 20.75 9.5 20.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.50024 8.52788V12.9724L12.3002 14.6391M6.00024 0.75H13.0002"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BarsIcon({ className = 'size-4' }: IconProps = {}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 15"
    >
      <path
        d="M1 14H19M1 7.5L16 7.5M1 1H11.2857"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
