import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.jsx'
import WalletProvider from './context/WalletProvider.jsx'
import { AuthProvider } from './context/auth.jsx'
import FeedbackHost from './components/FeedbackHost'
import './styles/ui-safety.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider><WalletProvider><App /><FeedbackHost /></WalletProvider></AuthProvider>
  </BrowserRouter>
)
