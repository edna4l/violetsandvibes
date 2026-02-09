import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

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
