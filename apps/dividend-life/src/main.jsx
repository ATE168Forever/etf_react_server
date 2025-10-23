import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import { RouterProvider } from './router.jsx'
const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        <CookieConsent />
        <App />
      </RouterProvider>
    </QueryClientProvider>
  </StrictMode>,
)
