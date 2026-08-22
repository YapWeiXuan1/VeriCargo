const supabase = require('../services/supabaseClient')
const authService = require('../services/authService');

exports.register = async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const result = await authService.registerUser(email, password, fullName, role);
        res.status(201).json({ message: 'User registered successfully', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }

}

exports.login = async (req, res) => {
    try{
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const result = await authService.loginUser(email, password, rememberMe);
        res.status(200).json({ message: 'User logged in successfully', data: result });

    } catch (error) {
        res.status(500).json({ message: 'Error logging in user', error: error.message });
    }

}

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body
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
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords are required' })
        if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' })
        await authService.resetPassword(req.user.id, currentPassword, newPassword)
        res.status(200).json({ message: 'Password reset successfully' })
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Unable to reset password' })
    }
}