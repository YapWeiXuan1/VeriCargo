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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const result = await authService.loginUser(email, password);
        res.status(200).json({ message: 'User logged in successfully', data: result });

    } catch (error) {
        res.status(500).json({ message: 'Error logging in user', error: error.message });
    }

}