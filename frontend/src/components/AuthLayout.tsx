import type { FormEvent, ReactNode } from 'react';
import Logo from './Logo';

type AuthLayoutProps = {
  children: ReactNode;
  footer: ReactNode;
  onSubmit?: () => void;
  subtitle: string;
  subtitleSize?: 'base' | 'sm';
  title: string;
};

export default function AuthLayout({
  children,
  footer,
  onSubmit,
  subtitle,
  subtitleSize = 'base',
  title,
}: AuthLayoutProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface font-sans">
      <header className="shrink-0 px-10 py-[clamp(8px,3.5vh_-_14px,24px)]">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-[clamp(8px,8.8vh_-_47px,48px)]">
        <h1 className="text-center text-[clamp(24px,3.5vh_+_2px,40px)] font-extrabold text-text-primary">
          {title}
        </h1>
        <p
          className={`mt-[clamp(4px,2vh_-_9px,13px)] text-center text-text-secondary ${
            subtitleSize === 'base' ? 'text-[16px]' : 'text-[14px]'
          }`}
        >
          {subtitle}
        </p>

        <form
          className="mt-[clamp(12px,8.3vh_-_40px,50px)] w-full max-w-[601px] rounded-2xl px-4 pb-[clamp(12px,6.1vh_-_26px,40px)] pt-[clamp(12px,6.8vh_-_30px,43px)] shadow-[0px_30px_80px_-30px_rgba(219,39,119,0.5)] sm:px-[45px]"
          noValidate
          onSubmit={handleSubmit}
        >
          {children}
        </form>

        <p className="mt-[clamp(8px,4.2vh_-_18px,27px)] text-center text-[14px]">
          {footer}
        </p>
      </main>
    </div>
  );
}
