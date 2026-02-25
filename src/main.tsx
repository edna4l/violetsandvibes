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

const cleanupLegacyServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch (error) {
    console.error('Service worker cleanup failed:', error)
  }
}

cleanupLegacyServiceWorkers().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />)
})
