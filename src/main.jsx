import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import StockDetail from './StockDetail.jsx'
import FintechLanding from './FintechLanding.jsx'

const path = window.location.pathname;
const match = path.match(/^\/stock\/(\w+)/);
const stockId = match ? match[1] : null;
const showFintech = path === '/fintech';
const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {stockId ? <StockDetail stockId={stockId} /> : showFintech ? <FintechLanding /> : <App />}
    </QueryClientProvider>
  </StrictMode>,
)
