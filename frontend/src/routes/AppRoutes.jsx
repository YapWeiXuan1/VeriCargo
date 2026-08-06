import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import ShipperDashboard from '../pages/ShipperDashboard.jsx'
import CarrierDashboard from '../pages/CarrierDashboard.jsx'

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/shipperdashboard" element={<ShipperDashboard />} />
            <Route path="/carrierdashboard" element={<CarrierDashboard />} />
        </Routes>
    )
}

export default AppRoutes