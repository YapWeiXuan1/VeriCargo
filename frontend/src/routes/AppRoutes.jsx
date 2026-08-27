import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import ShipperDashboard from '../pages/ShipperDashboard.jsx'
import CarrierDashboard from '../pages/CarrierDashboard.jsx'
import Profile from '../pages/profile.jsx'
import WalletPage from '../pages/WalletPage.jsx'
import PlaceholderPage from '../pages/PlaceholderPage.jsx'
import { AgreementHistory, CarrierAgreements, CarrierClaims, CarrierProofs, ShipperAgreements, ShipperFunds, ShipperReview } from '../pages/EscrowPages.jsx'
import { useAuth } from '../context/auth'

function ProtectedRoute({ children }) {
    const { user } = useAuth()
    return user ? children : <Navigate to="/login" replace />
}

function DashboardRedirect() {
    const { user } = useAuth()
    return <Navigate to={user?.role?.toLowerCase() === 'carrier' ? '/carrierdashboard' : '/shipperdashboard'} replace />
}

function AppRoutes() {
    const { user, loading } = useAuth()
    if (loading) return <div className="app-loading">Checking your secure session…</div>
    return (
        <Routes>
            <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
            <Route path="/shipperdashboard" element={<ProtectedRoute><ShipperDashboard /></ProtectedRoute>} />
            <Route path="/carrierdashboard" element={<ProtectedRoute><CarrierDashboard /></ProtectedRoute>} />
            <Route path="/shipper/agreements" element={<ProtectedRoute><ShipperAgreements /></ProtectedRoute>} />
            <Route path="/shipper/review" element={<ProtectedRoute><ShipperReview /></ProtectedRoute>} />
            <Route path="/shipper/funds" element={<ProtectedRoute><ShipperFunds /></ProtectedRoute>} />
            <Route path="/shipper/history" element={<ProtectedRoute><AgreementHistory role="shipper" /></ProtectedRoute>} />
            <Route path="/carrier/agreements" element={<ProtectedRoute><CarrierAgreements /></ProtectedRoute>} />
            <Route path="/carrier/proofs" element={<ProtectedRoute><CarrierProofs /></ProtectedRoute>} />
            <Route path="/carrier/claims" element={<ProtectedRoute><CarrierClaims /></ProtectedRoute>} />
            <Route path="/carrier/history" element={<ProtectedRoute><AgreementHistory role="carrier" /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            {['shipments', 'tracking', 'carriers', 'documents', 'payments', 'settings'].map((page) => (
                <Route key={page} path={`/${page}`} element={<ProtectedRoute><PlaceholderPage title={page[0].toUpperCase() + page.slice(1)} /></ProtectedRoute>} />
            ))}
            <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
    )
}

export default AppRoutes
