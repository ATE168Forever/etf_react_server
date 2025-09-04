import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StockDetail from './StockDetail.jsx'
import FintechLanding from './FintechLanding.jsx'

const path = window.location.pathname;
const match = path.match(/^\/stock\/(\w+)/);
const stockId = match ? match[1] : null;
const showFintech = path === '/fintech';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {stockId ? <StockDetail stockId={stockId} /> : showFintech ? <FintechLanding /> : <App />}
  </StrictMode>,
)
