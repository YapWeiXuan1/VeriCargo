const authService = require('../services/authService');

const sessionCookieOptions = (rememberMe = false) => {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    }
    // Without maxAge the browser removes the cookie when the session ends.
    if (rememberMe) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        options.maxAge = thirtyDays
        options.expires = new Date(Date.now() + thirtyDays)
    }
    return options
};

exports.register = async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'Enter a valid email address.' });
        if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 160) return res.status(400).json({ message: 'Full name must contain 1 to 160 characters.' });
        if (!['shipper', 'carrier'].includes(role)) return res.status(400).json({ message: 'Select shipper or carrier.' });
        if (typeof password !== 'string' || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return res.status(400).json({ message: 'Password must contain at least 8 characters, an uppercase letter and a number.' });
        const result = await authService.registerUser(email, password, fullName, role);
        res.status(201).json({ message: 'User registered successfully', data: { user: result.user } });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error registering user' });
    }

}

exports.login = async (req, res) => {
    try{
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const result = await authService.loginUser(email, password, rememberMe);
        res.cookie('vericargo_session', result.token, sessionCookieOptions(Boolean(rememberMe)));
        res.status(200).json({ message: 'User logged in successfully', data: { user: result.user } });

    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error logging in user' });
    }

}

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body
        if (typeof fullName !== 'string' || fullName.trim().length > 160 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'Enter a name of at most 160 characters and a valid email address.' })
        if (!fullName?.trim() || !email?.trim()) return res.status(400).json({ message: 'Name and email are required' })
        const user = await authService.updateProfile(req.user.id, fullName.trim(), email.trim())
        res.status(200).json({ message: 'Profile updated successfully', user })
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Unable to update profile' })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return res.status(400).json({ message: 'Enter your current password and a new password with an uppercase letter and a number.' })
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords are required' })
        if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' })
        await authService.resetPassword(req.user.id, currentPassword, newPassword)
        res.status(200).json({ message: 'Password reset successfully' })
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Unable to reset password' })
    }
}

exports.logout = (req, res) => {
    res.clearCookie('vericargo_session', sessionCookieOptions(false));
    res.status(204).send();
}

exports.me = async (req, res) => {
    try {
        res.status(200).json({ user: await authService.getUserById(req.user.id) })
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Unable to load session' })
    }
}

exports.searchCarriers = async (req, res) => {
    try {
        const carriers = await authService.searchCarriers(req.query.search || '')
        res.status(200).json({ carriers })
    } catch (error) {
        res.status(500).json({ message: error.message || 'Unable to search carriers' })
    }
}
