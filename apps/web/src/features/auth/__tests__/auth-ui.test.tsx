// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '../../../i18n/I18nContext.js';
import { GlassCard } from '../../../components/ui/GlassCard.js';
import { GlassInput } from '../../../components/ui/GlassInput.js';
import { GlassPasswordField } from '../../../components/ui/GlassPasswordField.js';
import { GlassCheckbox } from '../../../components/ui/GlassCheckbox.js';
import { GlassButton } from '../../../components/ui/GlassButton.js';
import { LoginForm } from '../components/LoginForm.js';
import { SignUpForm } from '../components/SignUpForm.js';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));
vi.mock('../api/auth.api.js', () => ({
  login: loginMock,
  AuthApiError: class AuthApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

afterEach(() => {
  cleanup();
  loginMock.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('GlassCard Component', () => {
  it('renders children with glassmorphic styles and top-left highlight overlay', () => {
    const { container } = render(
      <GlassCard className="custom-test-card">
        <div>Content Inside Glass</div>
      </GlassCard>
    );

    const card = container.querySelector('.glass-card');
    expect(card).not.toBeNull();
    expect(card?.classList.contains('custom-test-card')).toBe(true);
    expect(screen.getByText('Content Inside Glass')).toBeDefined();

    // Check highlight overlay
    const highlight = container.querySelector('[aria-hidden="true"]');
    expect(highlight).not.toBeNull();
  });
});

describe('GlassInput Component', () => {
  it('renders icon inside input with proper padding and accessibility attributes', () => {
    render(
      <GlassInput
        label="Địa chỉ Email"
        placeholder="user@example.com"
        leadingIcon={<span data-testid="test-icon">icon</span>}
        errorMessage="Email không hợp lệ"
      />
    );

    const input = screen.getByPlaceholderText('user@example.com');
    expect(input).toBeDefined();
    expect(input.classList.contains('pl-11')).toBe(true);
    expect(screen.getByTestId('test-icon')).toBeDefined();

    const label = screen.getByText('Địa chỉ Email');
    expect(label.getAttribute('for')).toBe(input.id);

    // Check error state
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Email không hợp lệ');
  });
});

describe('GlassPasswordField Component', () => {
  it('renders password toggle inside input on the right with accessible aria-label', () => {
    render(
      <GlassPasswordField
        label="Mật khẩu"
        value="secret123"
        onChange={() => {}}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /Hiện mật khẩu/i });
    expect(toggleButton).toBeDefined();

    // Click to toggle visibility
    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: /Ẩn mật khẩu/i })).toBeDefined();
  });
});

describe('GlassCheckbox Component', () => {
  it('renders glass checkbox and toggles checked state', () => {
    const handleChange = vi.fn();
    render(
      <GlassCheckbox checked={false} onChange={handleChange}>
        Ghi nhớ đăng nhập
      </GlassCheckbox>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDefined();
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('GlassButton Component', () => {
  it('renders primary button with loading state', () => {
    render(
      <GlassButton loading fullWidth>
        Đang đăng nhập…
      </GlassButton>
    );

    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Đang đăng nhập…')).toBeDefined();
  });
});

describe('LoginForm Integration', () => {
  it('sends the remember-me selection with successful login', async () => {
    const result = {
      accessToken: 'access-token',
      user: { id: 'user-1', email: 'user@example.com', fullName: 'User' },
      staff: { id: 'user-1', email: 'user@example.com', fullName: 'User' },
    };
    const handleSuccess = vi.fn();
    loginMock.mockResolvedValue(result);

    const { container } = renderWithI18n(
      <LoginForm
        onSuccess={handleSuccess}
        onForgotPassword={() => {}}
      />,
    );

    fireEvent.change(container.querySelector('input[name="identifier"]')!, {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await vi.waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        identifier: 'user@example.com',
        password: 'password',
        rememberMe: true,
      });
    });
    expect(handleSuccess).toHaveBeenCalledWith(result, true);
  });

  it('renders all login fields, buttons, links, and validates required fields', () => {
    const handleSuccess = vi.fn();
    const handleForgotPassword = vi.fn();
    const handleSwitchToSignUp = vi.fn();

    const { container } = renderWithI18n(
      <LoginForm
        onSuccess={handleSuccess}
        onForgotPassword={handleForgotPassword}
        onSwitchToSignUp={handleSwitchToSignUp}
      />
    );

    // Headings
    expect(screen.getByText('Chào mừng trở lại')).toBeDefined();

    // Inputs
    const identifierInput = container.querySelector('input[name="identifier"]');
    const passwordInput = container.querySelector('input[type="password"]');
    expect(identifierInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    // Checkbox and Links
    expect(screen.getByText('Ghi nhớ đăng nhập')).toBeDefined();
    const forgotBtn = screen.getByText('Quên mật khẩu?');
    fireEvent.click(forgotBtn);
    expect(handleForgotPassword).toHaveBeenCalled();

    const switchBtn = screen.getByText('Đăng ký ngay');
    fireEvent.click(switchBtn);
    expect(handleSwitchToSignUp).toHaveBeenCalled();

    // Submit with empty fields triggers validation
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });
    fireEvent.click(submitBtn);

    // Validation alerts appear
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});

describe('SignUpForm Integration', () => {
  it('renders all registration fields, password confirmation, and validates empty submission', () => {
    const handleSuccess = vi.fn();
    const handleSwitchToLogin = vi.fn();

    const { container } = renderWithI18n(
      <SignUpForm
        onSuccess={handleSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );

    expect(screen.getByText('Tạo tài khoản mới')).toBeDefined();
    expect(container.querySelector('input[name="fullName"]')).not.toBeNull();
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(container.querySelector('input[name="phoneNumber"]')).not.toBeNull();
    expect(container.querySelector('input[name="password"]')).not.toBeNull();
    expect(container.querySelector('input[name="confirmPassword"]')).not.toBeNull();

    const switchBtn = screen.getByText('Đăng nhập ngay');
    fireEvent.click(switchBtn);
    expect(handleSwitchToLogin).toHaveBeenCalled();

    // Submit empty form triggers validation
    const submitBtn = screen.getByRole('button', { name: 'Đăng ký tài khoản' });
    fireEvent.click(submitBtn);

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});
