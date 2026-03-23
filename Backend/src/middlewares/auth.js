import jwt from 'jsonwebtoken'
import { User } from '../models/model.js'

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key'

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Access token required' })
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' })
        }
        req.user = user
        next()
    })
}

export const isVendor = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Access token required' })
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' })
        }

        if (user.role !== 'vendor' && user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access denied. Vendor privileges required.' })
        }

        req.user = user
        next()
    })
}

export const isSuperAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Access token required' })
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' })
        }

        if (user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access denied. Superadmin privileges required.' })
        }

        req.user = user
        next()
    })
}

export const isAdminOrReceptionist = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Access token required' })
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' })
        }

        if (!['admin', 'receptionist', 'vendor', 'superadmin', 'user'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied.' })
        }

        req.user = user
        next()
    })
}
