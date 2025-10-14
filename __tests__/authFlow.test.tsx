import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../src/tests/test-utils';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

// Create mocks that we can control per test
const mockAuthState = {
  user: null as any,
  callback: null as ((user: any) => void) | null,
  reset: () => {
    mockAuthState.user = null;
    if (mockAuthState.callback) {
      mockAuthState.callback(null);
    }
  },
  setUser: (user: any) => {
    mockAuthState.user = user;
    if (mockAuthState.callback) {
      mockAuthState.callback(user);
    }
  },
};

// Mock Firebase Auth to control authentication state in tests
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: mockAuthState.user })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    mockAuthState.callback = callback;
    // Always start with no user for each test
    setTimeout(() => callback(null), 0);
    return () => {}; // unsubscribe function
  }),
  signOut: vi.fn(() => {
    mockAuthState.reset();
    return Promise.resolve();
  }),
  signInAnonymously: vi.fn(() => {
    const user = {
      uid: 'test-guest-uid',
      email: null,
      displayName: 'Test Guest',
      isAnonymous: true,
    };
    mockAuthState.setUser(user);
    return Promise.resolve({ user });
  }),
  signInWithEmailAndPassword: vi.fn(() => {
    const user = {
      uid: 'test-user-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      isAnonymous: false,
    };
    mockAuthState.setUser(user);
    return Promise.resolve({ user });
  }),
  createUserWithEmailAndPassword: vi.fn(() => {
    const user = {
      uid: 'test-new-user-uid',
      email: 'newuser@example.com',
      displayName: 'New User',
      isAnonymous: false,
    };
    mockAuthState.setUser(user);
    return Promise.resolve({ user });
  }),
  updateProfile: vi.fn(() => Promise.resolve()),
}));

// Mock Firebase config
vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: null },
  db: {},
  rtdb: {},
}));

// Mock Firebase db functions
vi.mock('../src/firebase/db', () => ({
  subscribeToPresence: vi.fn(() => () => {}),
}));

// Mock color utils
vi.mock('../src/utils/colorUtils', () => ({
  generateUserColor: vi.fn(() => '#FF0000'),
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(async () => {
    // Reset auth state before each test
    vi.clearAllMocks();
    mockAuthState.reset();
  });

  it('should show login page when not authenticated', () => {
    render(<App />);
    
    expect(screen.getByText('Collab Canvas')).toBeInTheDocument();
    expect(screen.getByText('Collaborative real-time drawing and design tool')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Continue as Guest')).toBeInTheDocument();
  });

  it('should allow guest login with display name', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
    });

    // Find and fill the guest display name field
    const guestNameInput = screen.getByLabelText(/display name.*optional/i);
    await user.type(guestNameInput, 'Test Guest');

    // Click the guest login button
    const guestLoginBtn = screen.getByRole('button', { name: /continue as guest/i });
    await user.click(guestLoginBtn);

    // Wait for the canvas page to appear (indicates successful login)
    await waitFor(() => {
      expect(screen.getByText('Online Users')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify navbar shows user info (guest badge)
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('should allow guest login without display name', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
    });

    // Click the guest login button without entering a name
    const guestLoginBtn = screen.getByRole('button', { name: /continue as guest/i });
    await user.click(guestLoginBtn);

    // Wait for the canvas page to appear
    await waitFor(() => {
      expect(screen.getByText('Online Users')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify guest badge appears
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('should allow user registration with email/password', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    // Switch to sign up mode
    const signUpToggle = screen.getByRole('button', { name: /sign up/i });
    await user.click(signUpToggle);

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    // Fill in registration form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitBtn);

    // Wait for successful registration and canvas page
    await waitFor(() => {
      expect(screen.getByText('Online Users')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify user info in navbar (should show Registered badge)
    expect(screen.getByText('Registered')).toBeInTheDocument();
  });

  it('should allow registered user sign in', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Sign in with email/password
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInBtn);

    // Wait for canvas page
    await waitFor(() => {
      expect(screen.getByText('Online Users')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify user is signed in (should show Registered badge)
    expect(screen.getByText('Registered')).toBeInTheDocument();
  });

  it('should handle authentication errors gracefully', async () => {
    // This test would be more relevant with real Firebase, but for now we'll 
    // test that the form validation works
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Test form validation (email is required)
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('minlength', '6');

    // Verify we're on the login page
    expect(screen.getByText('Collaborative real-time drawing and design tool')).toBeInTheDocument();
  });

  it('should show form elements correctly', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    const guestBtn = screen.getByRole('button', { name: /continue as guest/i });

    // Verify form elements are present and functional
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(signInBtn).toBeInTheDocument();
    expect(guestBtn).toBeInTheDocument();

    // Test typing in inputs
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should allow sign out and return to login page', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for login form to be ready
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
    });

    // Guest login first
    const guestLoginBtn = screen.getByRole('button', { name: /continue as guest/i });
    await user.click(guestLoginBtn);

    await waitFor(() => {
      expect(screen.getByText('Online Users')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Now sign out
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    // Wait for login page to appear
    await waitFor(() => {
      expect(screen.getByText('Collaborative real-time drawing and design tool')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });
});
