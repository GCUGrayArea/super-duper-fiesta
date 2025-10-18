import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Global debug controls for developers and agents.
// - enabled: master on/off for all debug logging
// - scopes: optional allowlist of scope names (e.g., 'queue', 'sync', 'aiTools').
//   When non-empty, only logs with matching scope are printed. When empty, all scopes log.

export interface DebugState {
  enabled: boolean;
  scopes: string[]; // allowlist; empty = all
}

const initialState: DebugState = {
  enabled: false,
  scopes: [],
};

const debugSlice = createSlice({
  name: 'debug',
  initialState,
  reducers: {
    setDebugEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setDebugScopes: (state, action: PayloadAction<string[]>) => {
      state.scopes = Array.isArray(action.payload) ? action.payload : [];
    },
    addDebugScope: (state, action: PayloadAction<string>) => {
      const s = action.payload;
      if (!state.scopes.includes(s)) state.scopes.push(s);
    },
    removeDebugScope: (state, action: PayloadAction<string>) => {
      const s = action.payload;
      state.scopes = state.scopes.filter(x => x !== s);
    },
    clearDebugScopes: (state) => {
      state.scopes = [];
    },
  },
});

export const {
  setDebugEnabled,
  setDebugScopes,
  addDebugScope,
  removeDebugScope,
  clearDebugScopes,
} = debugSlice.actions;

export const selectDebug = (state: any) => state.debug as DebugState;
export const selectDebugEnabled = (state: any) => (state.debug as DebugState).enabled;
export const selectDebugScopes = (state: any) => (state.debug as DebugState).scopes;

export default debugSlice.reducer;


