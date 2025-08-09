import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import StockDetail from './StockDetail.jsx'

const path = window.location.pathname;
const match = path.match(/^\/stock\/(\w+)/);
const stockId = match ? match[1] : null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {stockId ? <StockDetail stockId={stockId} /> : <App />}
  </StrictMode>,
)
