import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.tsx'
import { setDebugEnabled, setDebugScopes } from './store/debugSlice'
// Dev-only: read ?debug=1&scopes=a,b,c to enable scoped logging globally
try {
  const params = new URLSearchParams(window.location.search)
  const debugOn = params.get('debug')
  if (debugOn === '1' || debugOn === 'true') {
    store.dispatch(setDebugEnabled(true))
    const scopesParam = params.get('scopes')
    if (scopesParam) {
      const scopes = scopesParam.split(',').map(s => s.trim()).filter(Boolean)
      store.dispatch(setDebugScopes(scopes))
    }
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
