import { Router } from "express";
import jwt from 'jsonwebtoken';

const router = Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// Middleware for academic cell access
const isAcademicCell = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Allow academic cell, admin, or superadmin roles
    if (!['academic-cell', 'admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Academic cell privileges required.'
        });
    }

    next();
};

// Get academic cell data
router.get('/', authenticateToken, isAcademicCell, (req, res) => {
    res.json({
        success: true,
        message: 'Academic cell data retrieved successfully',
        data: {
            // Add your academic cell data here
            departments: [],
            courses: [],
            students: []
        }
    });
});

// Create academic cell record
router.post('/', authenticateToken, isAcademicCell, (req, res) => {
    try {
        const { name, department, course, semester } = req.body;

        // Validate required fields
        if (!name || !department || !course) {
            return res.status(400).json({
                success: false,
                message: 'Name, department, and course are required'
            });
        }

        // Here you would save to database
        const newRecord = {
            id: Date.now(), // Temporary ID
            name,
            department,
            course,
            semester,
            createdBy: req.user.username,
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Academic cell record created successfully',
            data: newRecord
        });

    } catch (error) {
        console.error('Create academic cell record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create record',
            error: error.message
        });
    }
});

// Update academic cell record
router.put('/:id', authenticateToken, isAcademicCell, (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Here you would update in database
        const updatedRecord = {
            id: parseInt(id),
            ...updateData,
            updatedBy: req.user.username,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            message: 'Academic cell record updated successfully',
            data: updatedRecord
        });

    } catch (error) {
        console.error('Update academic cell record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update record',
            error: error.message
        });
    }
});

// Delete academic cell record
router.delete('/:id', authenticateToken, isAcademicCell, (req, res) => {
    try {
        const { id } = req.params;

        // Here you would delete from database
        res.json({
            success: true,
            message: 'Academic cell record deleted successfully'
        });

    } catch (error) {
        console.error('Delete academic cell record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete record',
            error: error.message
        });
    }
});

export default router;
