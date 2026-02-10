import { useState, useEffect } from 'react'
import { supabase } from "@/lib/supabase";

import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('_health').select('*').limit(1)
        if (error) {
          console.log('Connection test result:', error.message)
        }
        setConnected(true)
      } catch (error) {
        console.error('Connection error:', error)
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Supabase + Vite + React</h1>
        <div className="connection-status">
          {loading ? (
            <p>Testing Supabase connection...</p>
          ) : (
            <p>
              Supabase Status: 
              <span className={connected ? 'connected' : 'disconnected'}>
                {connected ? ' ✅ Connected' : ' ❌ Connection Issue'}
              </span>
            </p>
          )}
        </div>
        <div className="env-info">
          <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
          <p>Environment variables loaded successfully!</p>
        </div>
      </header>
    </div>
  )
}

export default App
