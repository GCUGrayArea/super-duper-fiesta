import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from '../store/canvasSlice';

// Create a test store with the same structure as the real store
const createTestStore = () => {
  return configureStore({
    reducer: {
      canvas: canvasReducer,
    },
  });
};

interface TestProviderProps {
  children: React.ReactNode;
  store?: ReturnType<typeof createTestStore>;
}

// Test wrapper component that provides Redux store
const TestProvider: React.FC<TestProviderProps> = ({ children, store }) => {
  const testStore = store || createTestStore();
  
  return (
    <Provider store={testStore}>
      {children}
    </Provider>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    store?: ReturnType<typeof createTestStore>;
  }
) => {
  const { store, ...renderOptions } = options || {};
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <TestProvider store={store}>{children}</TestProvider>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestStore };
export { TestProvider };
