import lockBody from '../assets/icons/lock-body.svg';
import lockShackle from '../assets/icons/lock-shackle.svg';
import mail from '../assets/icons/mail.svg';
import userBody from '../assets/icons/user-body.svg';
import userHead from '../assets/icons/user-head.svg';

export function UserIcon() {
  return (
    <span className="relative block size-4 shrink-0" aria-hidden="true">
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
    <span className="relative block size-4 shrink-0" aria-hidden="true">
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
      className="relative block h-[11px] w-[15px] shrink-0"
      aria-hidden="true"
    >
      <span className="absolute inset-[-4.55%_-3.33%]">
        <img alt="" className="block max-w-none size-full" src={mail} />
      </span>
    </span>
  );
}
