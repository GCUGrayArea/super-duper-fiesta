import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    canvas: canvasReducer,
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
