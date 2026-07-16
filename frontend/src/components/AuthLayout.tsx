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

  return (
    <div
      className={`auth-page ${variant === 'login' ? 'auth-page--login' : ''}`}
    >
      <div className="auth-design-canvas">
        <header className="auth-header">
          <Logo />
        </header>

        <main className="auth-main">
          <div className="auth-stack">
            <h1 className="auth-title">{title}</h1>
            <p
              className={`auth-subtitle ${
                subtitleSize === 'base'
                  ? 'auth-subtitle--base'
                  : 'auth-subtitle--sm'
              }`}
            >
              {subtitle}
            </p>

            <form
              className={`auth-form ${formClassName}`}
              noValidate
              onSubmit={handleSubmit}
            >
              {children}
            </form>

            {footer && <p className="auth-footer">{footer}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
