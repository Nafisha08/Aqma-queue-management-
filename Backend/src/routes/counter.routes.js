// Backend/src/routes/counter.routes.js
import { Router } from "express";
import jwt from 'jsonwebtoken';
import { Counter } from "../models/counter.js";
import { User } from "../models/user.model.js";
import mongoose from 'mongoose';

const router = Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// Authentication middleware
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

// GET all counters
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/counters ===');
        console.log('User role:', req.user.role);
        console.log('User vendorId:', req.user.vendorId);

        let query = {};

        // Filter by vendor for vendor role - show all counters created by the vendor
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }
        // Filter for user role - show only counters the user has access to (their assigned counter)
        else if (req.user.role === 'user') {
            const user = await User.findById(req.user.id);
            if (user && user.counterId) {
                query._id = user.counterId;
            } else {
                // If no counter assigned, return empty result
                query._id = null;
            }
        }

        // ⭐ ADD DETAILED LOGS (EXACTLY LIKE CABIN API)
        console.log('Query filter:', query);

        const counters = await Counter.find(query)
            .populate('vendorId', 'companyName')
            .sort({ createdAt: -1 });

        // ⭐ ADD DETAILED LOGS (EXACTLY LIKE CABIN API)
        console.log(`✅ Found ${counters.length} active counters`);
        if (counters.length > 0) {
            console.log('Counter names:', counters.map(c => c.name).join(', '));
        }
        console.log('Counter data:', JSON.stringify(counters, null, 2));

        res.json({
            success: true,
            counters: counters.map(counter => ({
                _id: counter._id.toString(),
                name: counter.name,
                location: counter.location || '',
                purpose: counter.purpose || '',
                status: counter.status,
                vendorId: counter.vendorId ? counter.vendorId._id || counter.vendorId : null,
                vendorName: counter.vendorId?.companyName || '',
                createdAt: counter.createdAt,
                updatedAt: counter.updatedAt
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching counters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counters',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// GET counter by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid counter ID format'
            });
        }

        const counter = await Counter.findById(id).populate('vendorId', 'companyName');

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Counter not found'
            });
        }

        // Authorization check
        if (req.user.role === 'vendor' && counter.vendorId.toString() !== req.user.vendorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            counter: {
                _id: counter._id.toString(),
                name: counter.name,
                location: counter.location || '',
                purpose: counter.purpose || '',
                status: counter.status,
                vendorId: counter.vendorId._id.toString(),
                vendorName: counter.vendorId.companyName,
                createdAt: counter.createdAt,
                updatedAt: counter.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Error fetching counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counter',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// ✅ POST - Create new counter WITH AUTO-ASSIGNMENT
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, location, purpose, status = 'active', vendorId } = req.body;

        console.log('=== POST /api/counters ===');
        console.log('Counter data:', req.body);
        console.log('User role:', req.user.role);
        console.log('User vendorId:', req.user.vendorId);

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Counter name is required'
            });
        }

        // Determine vendorId
        let finalVendorId = vendorId;

        // If vendor is creating counter, use their vendorId
        if (req.user.role === 'vendor') {
            finalVendorId = req.user.vendorId;
        }

        if (!finalVendorId) {
            return res.status(400).json({
                success: false,
                message: 'Vendor ID is required'
            });
        }

        // Validate vendorId format
        if (!mongoose.Types.ObjectId.isValid(finalVendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vendor ID format'
            });
        }

        // Create counter
        const counter = new Counter({
            name,
            location: location || '',
            purpose: purpose || '',
            status,
            vendorId: finalVendorId,
            cabinId: null // ✅ No cabin assignment
        });

        const savedCounter = await counter.save();
        console.log('✅ Counter created:', savedCounter._id);

        // ✅ AUTO-ASSIGN TO ALL USERS OF THIS VENDOR WITHOUT COUNTER
        try {
            const usersWithoutCounter = await User.find({
                vendorId: finalVendorId,
                role: 'user', // Only assign to 'user' role
                active: true,
                counterId: null // Only users without counter
            });

            if (usersWithoutCounter.length > 0) {
                // Assign the new counter to all users without counters
                await User.updateMany(
                    {
                        vendorId: finalVendorId,
                        role: 'user',
                        active: true,
                        counterId: null
                    },
                    { counterId: savedCounter._id }
                );
                console.log(`✅ Counter auto-assigned to ${usersWithoutCounter.length} user(s) without counters`);
            } else {
                console.log('⚠️ No eligible users found for auto-assignment (all users already have counters)');
            }
        } catch (assignError) {
            console.error('❌ Error auto-assigning counter:', assignError);
            // Don't fail counter creation if assignment fails
        }

        res.status(201).json({
            success: true,
            message: 'Counter created successfully',
            counter: {
                _id: savedCounter._id.toString(),
                name: savedCounter.name,
                location: savedCounter.location,
                purpose: savedCounter.purpose,
                status: savedCounter.status,
                vendorId: savedCounter.vendorId.toString()
            }
        });

    } catch (error) {
        console.error('❌ Error creating counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create counter',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// PUT - Update counter
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, purpose, status } = req.body;

        console.log('=== PUT /api/counters/:id ===');
        console.log('Counter ID:', id);
        console.log('Update data:', req.body);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid counter ID format'
            });
        }

        const counter = await Counter.findById(id);

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Counter not found'
            });
        }

        // Authorization check
        if (req.user.role === 'vendor' && counter.vendorId.toString() !== req.user.vendorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update fields
        if (name) counter.name = name;
        if (location !== undefined) counter.location = location;
        if (purpose !== undefined) counter.purpose = purpose;
        if (status) counter.status = status;

        const updatedCounter = await counter.save();
        console.log('✅ Counter updated:', updatedCounter._id);

        res.json({
            success: true,
            message: 'Counter updated successfully',
            counter: {
                _id: updatedCounter._id.toString(),
                name: updatedCounter.name,
                location: updatedCounter.location,
                purpose: updatedCounter.purpose,
                status: updatedCounter.status,
                vendorId: updatedCounter.vendorId.toString()
            }
        });

    } catch (error) {
        console.error('❌ Error updating counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update counter',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// DELETE - Delete counter (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('=== DELETE /api/counters/:id ===');
        console.log('Counter ID:', id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid counter ID format'
            });
        }

        const counter = await Counter.findById(id);

        if (!counter) {
            return res.status(404).json({
                success: false,
                message: 'Counter not found'
            });
        }

        // Authorization check
        if (req.user.role === 'vendor' && counter.vendorId.toString() !== req.user.vendorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Soft delete - set status to inactive
        counter.status = 'inactive';
        await counter.save();

        // Remove counter assignment from users
        await User.updateMany(
            { counterId: counter._id },
            { $set: { counterId: null } }
        );

        console.log('✅ Counter deleted (soft delete)');

        res.json({
            success: true,
            message: 'Counter deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete counter',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

export default router;