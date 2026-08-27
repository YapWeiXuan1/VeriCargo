const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const cookies = Object.fromEntries(
        (req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
            const separator = part.indexOf('=')
            const key = part.slice(0, separator).trim()
            const value = separator >= 0 ? part.slice(separator + 1) : ''
            return [key, decodeURIComponent(value)]
        })
    )
    // Bearer support is retained temporarily for existing API clients.
    const token = cookies.vericargo_session || (header.startsWith('Bearer ') ? header.slice(7) : '')

    try {
        if (!token) throw new Error('Missing token')
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'vericargo-api',
            audience: 'vericargo-web',
        })
        req.user = { ...payload, id: payload.sub }
        next()
    } catch {
        res.status(401).json({ message: 'Authentication required' })
    }
}

module.exports = requireAuth
