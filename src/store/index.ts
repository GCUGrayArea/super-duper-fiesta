import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import canvasReducer from './canvasSlice';
import presenceReducer from './presenceSlice';
import debugReducer from './debugSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    canvas: canvasReducer,
    presence: presenceReducer,
    debug: debugReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firebase timestamp objects and other non-serializable data
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user.metadata'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
