import type { FormEvent, ReactNode } from 'react';
import Header from './Header';

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

const pageClassName = 'min-h-[100dvh] overflow-x-hidden bg-surface font-sans';

const canvasClassName = 'lg:relative lg:h-[100dvh] lg:overflow-hidden';

const mainClassName =
  'lg:absolute lg:left-1/2 lg:top-0 lg:w-[1920px] lg:min-h-0 lg:origin-top lg:[height:calc(100dvh/var(--canvas-scale))] lg:[transform:translateX(-50%)_scale(var(--canvas-scale))]';

const formWrapperClassName =
  'flex justify-center px-4 pb-6 pt-8 md:min-h-[100dvh] md:items-center md:px-[clamp(1rem,3vw,2.5rem)] md:pb-[clamp(1.75rem,5dvh,3.5rem)] md:pt-[clamp(5.5rem,10dvh,8rem)] lg:contents';

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
      <div className={canvasClassName}>
        <main className={mainClassName}>
          <Header layout="overlay" variant="minimal" />

          <div className={formWrapperClassName}>
            <div className="flex w-[min(100%,37.5625rem)] flex-col items-center lg:absolute lg:left-1/2 lg:top-1/2 lg:w-[601px] lg:-translate-x-1/2 lg:-translate-y-1/2">
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
                    ? 'lg:mt-[40px] lg:pb-[40px] lg:pt-[20px]'
                    : 'lg:mt-[24px] lg:py-[24px]'
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
                      : 'mt-[clamp(1rem,2.8dvh,1.75rem)] lg:mt-[16px]'
                  } lg:leading-[1.35]`}
                >
                  {footer}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
