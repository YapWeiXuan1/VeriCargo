const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    try {
        if (!token) throw new Error('Missing token')
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch {
        res.status(401).json({ message: 'Authentication required' })
    }
}

module.exports = requireAuth