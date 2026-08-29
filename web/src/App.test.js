import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('SecureMe Frontend Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('1. Renders SecureMe branding, logo and login form', () => {
    render(<App />);
    expect(screen.getByText(/SecureMe/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-Driven Mobile Security Analyzer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Register$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔐 Login/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your@email.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
  });

  test('2. Allows switching between Login and Register tabs', () => {
    render(<App />);
    const registerTab = screen.getByRole('button', { name: /^Register$/i });
    fireEvent.click(registerTab);

    // Should now show Full Name field for registration
    expect(screen.getByPlaceholderText(/Your name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📝 Register/i })).toBeInTheDocument();

    // Switch back to Login
    const loginTab = screen.getByRole('button', { name: /^Login$/i });
    fireEvent.click(loginTab);
    expect(screen.queryByPlaceholderText(/Your name/i)).not.toBeInTheDocument();
  });

  test('3. Allows navigating to Forgot Password screen and back', () => {
    render(<App />);
    const forgotBtn = screen.getByText(/Forgot password\?/i);
    fireEvent.click(forgotBtn);

    expect(screen.getByText(/🔑 Reset Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📧 Send 6-Digit Code/i })).toBeInTheDocument();

    const backBtn = screen.getByText(/← Back to Login/i);
    fireEvent.click(backBtn);
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
  });

  test('4. Renders Dashboard with navigation tabs when user is logged in', () => {
    // Simulate active logged-in user in localStorage
    localStorage.setItem(
      'secureme_user',
      JSON.stringify({ id: 'user-123', name: 'Test User', email: 'test@secureme.com', token: 'token-123' })
    );

    render(<App />);
    expect(screen.getByText(/👤 Test User/i)).toBeInTheDocument();
    expect(screen.getByText(/🚪 Logout/i)).toBeInTheDocument();
    expect(screen.getByText(/🏠 Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/🔑 Password/i)).toBeInTheDocument();
    expect(screen.getByText(/📁 File Scan/i)).toBeInTheDocument();
    expect(screen.getByText(/🔄 Sync/i)).toBeInTheDocument();
    expect(screen.getByText(/ℹ️ About/i)).toBeInTheDocument();
  });

  test('5. Allows switching navigation tabs in Dashboard', () => {
    localStorage.setItem(
      'secureme_user',
      JSON.stringify({ id: 'user-123', name: 'Test User', email: 'test@secureme.com', token: 'token-123' })
    );

    render(<App />);
    
    // Switch to Password tab
    fireEvent.click(screen.getByText(/🔑 Password/i));
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();

    // Switch to File Scan tab
    fireEvent.click(screen.getByText(/📁 File Scan/i));
    expect(screen.getByText(/File Scanner/i)).toBeInTheDocument();

    // Switch to Sync tab
    fireEvent.click(screen.getByText(/🔄 Sync/i));
    expect(screen.getByPlaceholderText(/Find in SecureMe app/i)).toBeInTheDocument();

    // Switch to About tab
    fireEvent.click(screen.getByText(/ℹ️ About/i));
    expect(screen.getByText(/About SecureMe/i)).toBeInTheDocument();
  });

  test('6. Logs out user and returns to Login screen', () => {
    localStorage.setItem(
      'secureme_user',
      JSON.stringify({ id: 'user-123', name: 'Test User', email: 'test@secureme.com', token: 'token-123' })
    );

    render(<App />);
    const logoutBtn = screen.getByText(/🚪 Logout/i);
    fireEvent.click(logoutBtn);

    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
    expect(localStorage.getItem('secureme_user')).toBeNull();
  });
});
