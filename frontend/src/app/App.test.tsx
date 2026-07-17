import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from './App';
import {
  saveSession,
  type AuthSession,
  type CurrentUser,
} from '@/features/auth/auth';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';

function userResponse(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'player@example.com',
    emailVerified: true,
    enabled: true,
    id: '019f66a0-981f-7368-aec1-4e814cc269f1',
    role: 'USER',
    updatedAt: '2026-07-16T12:00:00Z',
    username: 'player',
    ...overrides,
  };
}

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: userResponse(),
    ...overrides,
  };
}

async function goToLogin() {
  const user = userEvent.setup();
  render(<App />);

  const footer = screen.getByText(/already have an account/i).closest('p')!;
  await user.click(within(footer).getByRole('button', { name: /sign in/i }));
  return user;
}

async function submitValidRegistration(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(screen.getByLabelText('Email'), 'player@example.com');
  await user.type(screen.getByLabelText('Username'), 'player');
  await user.type(screen.getByLabelText('Password'), 'StrongerPass123');
  await user.type(screen.getByLabelText('Confirm password'), 'StrongerPass123');
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

async function submitValidLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Email or username'),
    'player@example.com',
  );
  await user.type(screen.getByLabelText('Password'), 'StrongerPass123');
  await user.click(screen.getByRole('button', { name: /log in/i }));
}

describe('App', () => {
  it('renders the register page heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('registers a user and shows the verification pending state', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          confirmPassword: 'StrongerPass123',
          email: 'player@example.com',
          password: 'StrongerPass123',
          username: 'player',
        });

        return HttpResponse.json(
          { data: userResponse({ emailVerified: false }) },
          { status: 201 },
        );
      }),
    );

    render(<App />);
    await submitValidRegistration(user);

    expect(
      await screen.findByRole('heading', { name: /check your email/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/player@example.com/i)).toBeInTheDocument();
  });

  it('confirms email verification links and returns to login', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/verify-email?token=valid-token');
    server.use(
      http.post(
        `${API_URL}/api/auth/email-verification/confirm`,
        async ({ request }) => {
          await expect(request.json()).resolves.toMatchObject({
            token: 'valid-token',
          });

          return HttpResponse.json({
            data: userResponse({ emailVerified: true }),
          });
        },
      ),
    );

    render(<App />);

    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /email verified/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/player@example.com/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to log in/i }));

    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/email verified/i);
  });

  it('shows a safe message for invalid verification links', async () => {
    window.history.replaceState(null, '', '/verify-email?token=expired-token');
    server.use(
      http.post(`${API_URL}/api/auth/email-verification/confirm`, () =>
        HttpResponse.json(
          {
            code: 'EMAIL_VERIFICATION_FAILED',
            instance: '/api/auth/email-verification/confirm',
            message: 'Email verification link is invalid or expired',
            status: 400,
          },
          { status: 400 },
        ),
      ),
    );

    render(<App />);

    expect(
      await screen.findByText(/verification link is invalid or expired/i),
    ).toBeInTheDocument();
  });

  it('shows validation errors for empty and mismatched registration fields', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(
      screen.getByText('Please confirm your password'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Username'), 'player');
    await user.type(screen.getByLabelText('Password'), 'StrongerPass123');
    await user.type(screen.getByLabelText('Confirm password'), 'Different123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      screen.getByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows duplicate registration errors from the API', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/auth/register`, () =>
        HttpResponse.json(
          {
            code: 'USER_ALREADY_EXISTS',
            instance: '/api/auth/register',
            message: 'A user with this email or username already exists',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );

    render(<App />);
    await submitValidRegistration(user);

    expect(
      await screen.findByText(
        /a user with this email or username already exists/i,
      ),
    ).toBeInTheDocument();
  });

  it('navigates between register, login, and forgot password pages', async () => {
    const user = await goToLogin();

    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Forgot?' }));
    expect(
      screen.getByRole('heading', { name: /reset your password/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to log in/i }));
    await user.click(
      screen.getByRole('button', { name: /create an account/i }),
    );
    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('logs in a verified user, stores the session, and logs out', async () => {
    const user = await goToLogin();
    server.use(
      http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          identifier: 'player@example.com',
          password: 'StrongerPass123',
        });

        return HttpResponse.json({
          data: {
            accessToken: 'jwt-token',
            expiresInSeconds: 900,
            tokenType: 'Bearer',
            user: userResponse(),
          },
        });
      }),
    );

    await submitValidLogin(user);

    expect(
      await screen.findByRole('heading', { name: /welcome, player/i }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem('code-racer.auth-session')).toContain(
      'jwt-token',
    );
    expect(
      screen.queryByRole('button', { name: /^admin$/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/logged out/i);
    expect(window.sessionStorage.getItem('code-racer.auth-session')).toBeNull();
  });

  it('shows failed login errors and keeps the user on the login page', async () => {
    const user = await goToLogin();
    server.use(
      http.post(`${API_URL}/api/auth/login`, () =>
        HttpResponse.json(
          {
            code: 'INVALID_CREDENTIALS',
            instance: '/api/auth/login',
            message: 'Invalid email, username, or password',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );

    await submitValidLogin(user);

    expect(
      await screen.findByText(/email, username, or password is incorrect/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it('validates empty login fields', async () => {
    const user = await goToLogin();

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(
      screen.getByText('Email or username is required'),
    ).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('redirects protected routes to login without rendering protected content', () => {
    window.history.replaceState(null, '', '/dashboard');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/please log in/i);
    expect(
      screen.queryByRole('heading', { name: /welcome, player/i }),
    ).not.toBeInTheDocument();
  });

  it('updates the login notice when a protected route redirects to login again', async () => {
    const user = userEvent.setup();
    saveSession(session());
    window.history.replaceState(null, '', '/dashboard');

    render(<App />);

    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/logged out/i);

    window.history.back();

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/please log in/i),
    );
  });

  it('restores valid admin sessions and allows admin navigation', async () => {
    const user = userEvent.setup();
    saveSession(
      session({
        user: userResponse({ role: 'ADMIN', username: 'admin' }),
      }),
    );
    window.history.replaceState(null, '', '/dashboard');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /welcome, admin/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^admin$/i }));
    expect(
      await screen.findByRole('heading', { name: /admin console/i }),
    ).toBeInTheDocument();
  });

  it('redirects expired sessions back to login', () => {
    saveSession(session({ expiresAt: Date.now() - 1 }));
    window.history.replaceState(null, '', '/dashboard');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/please log in/i);
  });

  it('redirects non-admin users away from the admin route', async () => {
    saveSession(session());
    window.history.replaceState(null, '', '/admin');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /welcome, player/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/admin access/i);
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });

  it('toggles password visibility with the eye button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    const [showToggle] = screen.getAllByRole('button', {
      name: /show password/i,
    });
    await user.click(showToggle);
    expect(password).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
