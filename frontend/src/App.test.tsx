import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

function getRegisterSubmitButton() {
  return screen
    .getAllByRole('button', { name: 'Sign in' })
    .find((button) => button.getAttribute('type') === 'submit')!;
}

describe('App', () => {
  it('renders the register page heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('navigates between the register and login pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    const footer = screen.getByText(/already have an account/i).closest('p')!;
    await user.click(within(footer).getByRole('button', { name: /sign in/i }));
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /create an account/i }),
    );
    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument();
  });

  it('opens the password reset page from login and returns with the arrow', async () => {
    const user = userEvent.setup();
    render(<App />);

    const footer = screen.getByText(/already have an account/i).closest('p')!;
    await user.click(within(footer).getByRole('button', { name: /sign in/i }));
    await user.click(screen.getByRole('button', { name: 'Forgot?' }));

    expect(
      screen.getByRole('heading', { name: /reset your password/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to log in/i }));
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument();
  });

  it('shows validation errors on an empty login submit', async () => {
    const user = userEvent.setup();
    render(<App />);

    const footer = screen.getByText(/already have an account/i).closest('p')!;
    await user.click(within(footer).getByRole('button', { name: /sign in/i }));
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      screen.getByText('Email or username is required'),
    ).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows validation errors on an empty register submit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(getRegisterSubmitButton());

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please repeat your password')).toBeInTheDocument();
  });

  it('shows email format and password mismatch errors', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Username'), 'erika');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Repeat password'), 'different');
    await user.click(getRegisterSubmitButton());

    expect(
      screen.getByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), '@gmail.com');
    expect(
      screen.queryByText(/enter a valid email address/i),
    ).not.toBeInTheDocument();
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
