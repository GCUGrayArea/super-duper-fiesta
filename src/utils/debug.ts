import { store } from '../store';

// Dev-only global debug logger. Reads from Redux `debug` slice.
// Use: debugLog('queue', 'processing', payload)

export function debugLog(scope: string, ...args: any[]) {
  try {
    const state: any = store.getState();
    const dbg = state?.debug as { enabled: boolean; scopes: string[] } | undefined;
    if (!dbg || !dbg.enabled) return;
    if (Array.isArray(dbg.scopes) && dbg.scopes.length > 0 && !dbg.scopes.includes(scope)) return;
    // eslint-disable-next-line no-console
    console.log(`[${scope}]`, ...args);
  } catch {
    // do nothing if store not ready yet
  }
}

export function debugError(scope: string, ...args: any[]) {
  try {
    const state: any = store.getState();
    const dbg = state?.debug as { enabled: boolean; scopes: string[] } | undefined;
    if (!dbg || !dbg.enabled) return;
    if (Array.isArray(dbg.scopes) && dbg.scopes.length > 0 && !dbg.scopes.includes(scope)) return;
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, ...args);
  } catch {
    // do nothing if store not ready yet
  }
}


