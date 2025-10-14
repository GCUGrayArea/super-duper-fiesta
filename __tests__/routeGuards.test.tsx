import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { type AuthState } from '../src/store/authSlice';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { PublicRoute } from '../src/components/PublicRoute';

// Mock store creation helper
const createMockStore = (authState: AuthState) => {
  return configureStore({
    reducer: {
      auth: () => authState,
    },
  });
};

// Test component helpers
const TestComponent = () => <div>Test Content</div>;

describe('Route Guards', () => {
  describe('ProtectedRoute', () => {
    it('should render children when user is authenticated', () => {
      const authenticatedState: AuthState = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          color: 'crimson',
          createdAt: 1640995200000,
          lastLoginAt: 1640995200000,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(authenticatedState);

      render(
        <Provider store={store}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(unauthenticatedState);

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/canvas']}>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      // Should not render the protected content
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should show loading state when authentication is loading', () => {
      const loadingState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(loadingState);

      render(
        <Provider store={store}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });

  describe('PublicRoute', () => {
    it('should render children when user is not authenticated', () => {
      const unauthenticatedState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(unauthenticatedState);

      render(
        <Provider store={store}>
          <BrowserRouter>
            <PublicRoute>
              <TestComponent />
            </PublicRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should redirect to canvas when user is authenticated', () => {
      const authenticatedState: AuthState = {
        user: {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          color: 'crimson',
          createdAt: 1640995200000,
          lastLoginAt: 1640995200000,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(authenticatedState);

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/login']}>
            <PublicRoute>
              <TestComponent />
            </PublicRoute>
          </MemoryRouter>
        </Provider>
      );

      // Should not render the public content
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should show loading state when authentication is loading', () => {
      const loadingState: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        sessionOnly: true,
      };

      const store = createMockStore(loadingState);

      render(
        <Provider store={store}>
          <BrowserRouter>
            <PublicRoute>
              <TestComponent />
            </PublicRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });
});
