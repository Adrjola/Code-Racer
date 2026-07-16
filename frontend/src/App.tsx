import { useState } from 'react';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

type Page = 'forgot' | 'login' | 'register';

export default function App() {
  const [page, setPage] = useState<Page>('register');

  if (page === 'login') {
    return (
      <LoginPage
        onCreateAccount={() => setPage('register')}
        onForgotPassword={() => setPage('forgot')}
      />
    );
  }

  if (page === 'forgot') {
    return <ForgotPasswordPage onBackToLogin={() => setPage('login')} />;
  }

  return <RegisterPage onSignIn={() => setPage('login')} />;
}
