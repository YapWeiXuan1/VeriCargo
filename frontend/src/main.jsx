import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.jsx'
import WalletProvider from './context/WalletProvider.jsx'
import { AuthProvider } from './context/auth.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider><WalletProvider><App /></WalletProvider></AuthProvider>
  </BrowserRouter>
)
