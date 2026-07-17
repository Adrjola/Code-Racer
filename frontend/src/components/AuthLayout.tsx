import type { FormEvent, ReactNode } from 'react';
import Logo from './Logo';

type AuthLayoutProps = {
  children: ReactNode;
  footer: ReactNode;
  formClassName?: string;
  onSubmit?: () => void;
  subtitle: string;
  subtitleSize?: 'base' | 'sm';
  title: string;
  variant?: 'default' | 'login';
};

const pageClassName =
  'min-h-[100dvh] overflow-x-hidden bg-surface font-sans lg:h-[100dvh] lg:min-h-0 lg:w-screen lg:overflow-hidden';

const headerClassName =
  'static p-4 md:absolute md:left-[clamp(1rem,2.1vw,2.5rem)] md:top-[clamp(1rem,2.1vw,2.5rem)] md:z-10 md:p-0 lg:left-[40px] lg:top-[24px]';

const mainClassName =
  'flex justify-center px-4 pb-6 pt-8 md:min-h-[100dvh] md:items-center md:px-[clamp(1rem,3vw,2.5rem)] md:pb-[clamp(1.75rem,5dvh,3.5rem)] md:pt-[clamp(5.5rem,10dvh,8rem)] lg:block lg:h-[1080px] lg:w-[1920px] lg:min-h-0 lg:p-0';

const titleClassName =
  'max-w-[min(100%,48rem)] text-center text-[clamp(1.75rem,1.35rem_+_1vw,2.5rem)] font-extrabold leading-[1.1] text-text-primary lg:text-[40px] lg:leading-[1.2]';

export default function AuthLayout({
  children,
  footer,
  formClassName = '',
  onSubmit,
  subtitle,
  subtitleSize = 'base',
  title,
  variant = 'default',
}: AuthLayoutProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };
  const isLogin = variant === 'login';

  return (
    <div className={pageClassName}>
      <div
        className={`min-h-[100dvh] lg:fixed lg:left-0 lg:top-0 lg:h-[1080px] lg:min-h-0 lg:w-[1920px] lg:origin-top-left ${
          isLogin
            ? 'lg:[transform:scale(var(--auth-login-scale))]'
            : 'lg:[transform:scale(var(--auth-scale))]'
        }`}
      >
        <header className={headerClassName}>
          <Logo />
        </header>

        <main className={mainClassName}>
          <div
            className={`flex w-[min(100%,37.5625rem)] flex-col items-center lg:absolute lg:w-[601px] lg:-translate-x-1/2 ${
              isLogin
                ? 'lg:left-[var(--auth-login-center-x)] lg:top-[254px]'
                : 'lg:left-[var(--auth-center-x)] lg:top-[114px]'
            }`}
          >
            <h1 className={titleClassName}>{title}</h1>
            <p
              className={`mt-[clamp(0.5rem,1.2dvh,0.875rem)] max-w-[min(100%,34rem)] text-center leading-[1.5] text-text-secondary lg:mt-[20px] lg:text-[14px] lg:leading-[1.35] ${
                subtitleSize === 'base' ? 'text-base' : 'text-sm'
              }`}
            >
              {subtitle}
            </p>

            <form
              className={`mt-[clamp(1.75rem,4.8dvh,3.125rem)] w-full rounded-2xl bg-[rgb(8_7_14_/_0.72)] px-[clamp(1.25rem,3.8vw,2.8125rem)] py-[clamp(1.75rem,4dvh,2.75rem)] shadow-[0_30px_80px_-30px_rgb(219_39_119_/_0.5)] lg:w-[601px] lg:rounded-[16px] lg:px-[45px] ${
                isLogin
                  ? 'lg:mt-[50px] lg:pb-[56px] lg:pt-[20px]'
                  : 'lg:mt-[49px] lg:py-[40px]'
              } ${formClassName}`}
              noValidate
              onSubmit={handleSubmit}
            >
              {children}
            </form>

            {footer && (
              <p
                className={`text-center text-sm leading-[1.45] text-text-faint ${
                  isLogin
                    ? 'mt-[clamp(1rem,2.8dvh,1.75rem)] lg:mt-[31px]'
                    : 'mt-[clamp(1rem,2.8dvh,1.75rem)] lg:mt-[27px]'
                } lg:leading-[1.35]`}
              >
                {footer}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
