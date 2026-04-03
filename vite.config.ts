import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all keys from .env / .env.local so we can accept both VITE_* and common SUPABASE_* names.
  const env = loadEnv(mode, process.cwd(), '')
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim()
  const anon = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim()

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anon),
    },
  }
})
