import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  APP_PREFERENCES_STORAGE_KEY,
  normalizeAppPreferences,
} from '@/lib/appPreferences'

const applyInitialUiPreferences = () => {
  if (typeof window === 'undefined') return

  const root = window.document.documentElement
  if (root.getAttribute('data-theme-preapplied') === '1') return

  root.classList.remove('light', 'dark')

  let hasDarkModePreference = false
  let darkMode = false

  try {
    const rawPrefs = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
    const parsedPrefs = rawPrefs ? JSON.parse(rawPrefs) : {}
    const prefs = normalizeAppPreferences(parsedPrefs)

    darkMode = prefs.darkMode
    hasDarkModePreference = typeof parsedPrefs?.darkMode === 'boolean'

    root.classList.toggle('vv-reduced-motion', prefs.reducedMotion)
    root.classList.toggle('vv-high-contrast', prefs.highContrast)
    root.classList.toggle('vv-large-text', prefs.largeText)
    root.setAttribute('data-autoplay-videos', prefs.autoPlayVideos ? 'true' : 'false')
    root.setAttribute('data-sound-effects', prefs.soundEffects ? 'true' : 'false')
  } catch {
    // Fall through to theme key handling below
  }

  const savedTheme = window.localStorage.getItem('theme')
  let resolvedTheme: 'light' | 'dark'

  if (hasDarkModePreference) {
    resolvedTheme = darkMode ? 'dark' : 'light'
  } else if (savedTheme === 'dark' || savedTheme === 'light') {
    resolvedTheme = savedTheme
  } else {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  root.classList.add(resolvedTheme)
}

applyInitialUiPreferences()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Force an immediate update check on every page load so stale SWs
        // are evicted without waiting for the browser's 24-hour update cycle.
        registration.update().catch(() => { /* network offline — ignore */ });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // New SW just took control — reload to get the fresh bundle.
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />)
