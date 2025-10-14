import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore fabric.js objects in actions and state
        ignoredActions: ['canvas/updateFabricObject'],
        ignoredPaths: ['canvas.fabricCanvas'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
