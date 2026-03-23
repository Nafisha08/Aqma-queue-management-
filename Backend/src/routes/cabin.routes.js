import { Router } from "express";
import jwt from 'jsonwebtoken';
import { Cabin, User } from "../models/model.js";
import mongoose from 'mongoose';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ✅ Middleware: Authenticate JWT Token
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

// ✅ GET /api/cabins - Get all cabins for vendor or user
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/cabins ===');
        console.log('User role:', req.user?.role);
        console.log('User vendorId:', req.user?.vendorId);

        let query = { isActive: true };

        // If vendor, only show their cabins
        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }
        // If user, show cabins from their vendor (if they have one)
        else if (req.user.role === 'user' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }

        console.log('Query filter:', query);

        const cabins = await Cabin.find(query).sort({ cabinNumber: 1, createdAt: -1 });

        console.log(`✅ Found ${cabins.length} active cabins`);
        if (cabins.length > 0) {
            console.log('Cabin names:', cabins.map(c => `${c.name} (#${c.cabinNumber})`).join(', '));
        }

        res.json({
            success: true,
            cabins
        });
    } catch (error) {
        console.error('❌ Error fetching cabins:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cabins',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ✅ POST /api/cabins - Create new cabin with AUTO-GENERATED cabinNumber
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('=== POST /api/cabins ===');
        console.log('Request body:', req.body);
        console.log('User role:', req.user?.role);
        console.log('User vendorId:', req.user?.vendorId);

        // ✅ VALIDATION: Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const { name, description, isActive, vendorId, cabinNumber } = req.body;

        // ✅ VALIDATION: Cabin name required
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Cabin name is required'
            });
        }

        // ✅ Determine vendorId
        let finalVendorId = vendorId;

        // If vendor is creating cabin, use their vendorId
        if (req.user.role === 'vendor') {
            finalVendorId = req.user.vendorId;
            console.log('✅ Using vendor\'s vendorId:', finalVendorId);
        }

        // ✅ VALIDATION: vendorId must exist
        if (!finalVendorId) {
            return res.status(400).json({
                success: false,
                message: 'Vendor ID is required'
            });
        }

        // ✅ VALIDATION: vendorId format check
        if (!mongoose.Types.ObjectId.isValid(finalVendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vendor ID format'
            });
        }

        console.log('Final vendorId:', finalVendorId);

        // ✅ AUTO-GENERATE cabinNumber if not provided
        let finalCabinNumber = cabinNumber;

        // Check if cabinNumber is provided and valid
        if (!finalCabinNumber || finalCabinNumber === '' || isNaN(finalCabinNumber)) {
            console.log('🔄 No valid cabinNumber provided, auto-generating...');

            // Find the highest cabin number for this vendor
            const lastCabin = await Cabin.findOne({ vendorId: finalVendorId })
                .sort({ cabinNumber: -1 })
                .select('cabinNumber')
                .lean();

            if (lastCabin && lastCabin.cabinNumber && !isNaN(lastCabin.cabinNumber)) {
                finalCabinNumber = Number(lastCabin.cabinNumber) + 1;
                console.log('✅ Found last cabin:', lastCabin.cabinNumber, '→ New:', finalCabinNumber);
            } else {
                finalCabinNumber = 1;
                console.log('✅ No existing cabins, starting with:', finalCabinNumber);
            }
        } else {
            // Convert to number and validate
            finalCabinNumber = Number(finalCabinNumber);

            if (isNaN(finalCabinNumber) || finalCabinNumber < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cabin number must be a positive number'
                });
            }

            // Check for duplicate cabin number
            const existingCabin = await Cabin.findOne({
                vendorId: finalVendorId,
                cabinNumber: finalCabinNumber
            });

            if (existingCabin) {
                return res.status(400).json({
                    success: false,
                    message: `Cabin number ${finalCabinNumber} already exists for your vendor`
                });
            }

            console.log('✅ Using provided cabinNumber:', finalCabinNumber);
        }

        // Final validation
        if (isNaN(finalCabinNumber)) {
            console.error('❌ CRITICAL: cabinNumber is still NaN!');
            return res.status(500).json({
                success: false,
                message: 'Failed to generate cabin number'
            });
        }

        console.log('🎯 Final cabinNumber to save:', finalCabinNumber, 'Type:', typeof finalCabinNumber);

        // ✅ Create cabin with validated cabinNumber
        const cabin = new Cabin({
            name: name.trim(),
            cabinNumber: Number(finalCabinNumber), // ✅ Ensure it's a Number
            description: description?.trim() || '',
            isActive: isActive !== undefined ? isActive : true,
            vendorId: finalVendorId
        });

        console.log('📝 Cabin object before save:', {
            name: cabin.name,
            cabinNumber: cabin.cabinNumber,
            cabinNumberType: typeof cabin.cabinNumber,
            vendorId: cabin.vendorId
        });

        const savedCabin = await cabin.save();
        console.log('✅ Cabin created:', savedCabin._id, '-', savedCabin.name, `(#${savedCabin.cabinNumber})`);

        // ✅ AUTO-ASSIGN CABIN TO USERS
        try {
            console.log('🔄 Starting auto-assignment process...');

            // Find all users of this vendor
            const allVendorUsers = await User.find({
                vendorId: finalVendorId,
                role: 'user'
            });

            console.log(`📊 Total users for vendor: ${allVendorUsers.length}`);

            // Separate users with and without cabins
            const usersWithoutCabin = allVendorUsers.filter(u => !u.cabinId);
            const usersWithCabin = allVendorUsers.filter(u => u.cabinId);

            console.log(`📊 Users without cabin: ${usersWithoutCabin.length}`);
            console.log(`📊 Users with existing cabin: ${usersWithCabin.length}`);

            let assignmentCount = 0;

            // ✅ STRATEGY 1: Assign to users WITHOUT cabin (always)
            if (usersWithoutCabin.length > 0) {
                const result = await User.updateMany(
                    {
                        vendorId: finalVendorId,
                        role: 'user',
                        cabinId: null
                    },
                    { $set: { cabinId: savedCabin._id } }
                );
                assignmentCount += result.modifiedCount;
                console.log(`✅ Assigned cabin to ${result.modifiedCount} new user(s)`);
            }

            // ✅ STRATEGY 2: UPDATE existing users to latest cabin (OPTIONAL)
            // Uncomment below if you want ALL users to get the latest cabin automatically
            /*
            if (usersWithCabin.length > 0) {
                const result = await User.updateMany(
                    {
                        vendorId: finalVendorId,
                        role: 'user',
                        cabinId: { $ne: null }
                    },
                    { $set: { cabinId: savedCabin._id } }
                );
                assignmentCount += result.modifiedCount;
                console.log(`✅ Updated ${result.modifiedCount} existing user(s) to new cabin`);
            }
            */

            if (assignmentCount === 0) {
                console.log('⚠️ No users found for auto-assignment');
            } else {
                console.log(`🎉 Total users assigned: ${assignmentCount}`);
            }

        } catch (assignError) {
            console.error('❌ Error during auto-assignment:', assignError);
            // Don't fail cabin creation if assignment fails
        }

        res.status(201).json({
            success: true,
            message: 'Cabin created successfully',
            cabin: savedCabin
        });

    } catch (error) {
        console.error('❌ Error creating cabin:', error);
        console.error('Error stack:', error.stack);

        // ✅ Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A cabin with this name or number already exists for your vendor'
            });
        }

        // ✅ Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create cabin',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ✅ PUT /api/cabins/:id - Update cabin
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('=== PUT /api/cabins/:id ===');
        console.log('Cabin ID:', req.params.id);
        console.log('Update data:', req.body);

        const { id } = req.params;
        const { name, description, isActive, cabinNumber } = req.body;

        // ✅ VALIDATION: Cabin name required
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Cabin name is required'
            });
        }

        // ✅ VALIDATION: Check if cabin exists
        const cabin = await Cabin.findById(id);

        if (!cabin) {
            return res.status(404).json({
                success: false,
                message: 'Cabin not found'
            });
        }

        // ✅ AUTHORIZATION: Check if vendor has permission
        if (req.user.role === 'vendor' && req.user.vendorId && cabin.vendorId.toString() !== req.user.vendorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own cabins.'
            });
        }

        // ✅ Check if cabinNumber is being changed and if it conflicts
        if (cabinNumber && cabinNumber !== cabin.cabinNumber) {
            const existingCabin = await Cabin.findOne({
                vendorId: cabin.vendorId,
                cabinNumber: cabinNumber,
                _id: { $ne: id }
            });

            if (existingCabin) {
                return res.status(400).json({
                    success: false,
                    message: `Cabin number ${cabinNumber} already exists for your vendor`
                });
            }
            cabin.cabinNumber = cabinNumber;
        }

        // ✅ Update cabin
        cabin.name = name.trim();
        cabin.description = description?.trim() || '';
        cabin.isActive = isActive !== undefined ? isActive : cabin.isActive;

        const updatedCabin = await cabin.save();
        console.log('✅ Cabin updated:', updatedCabin._id);

        res.json({
            success: true,
            message: 'Cabin updated successfully',
            cabin: updatedCabin
        });

    } catch (error) {
        console.error('❌ Error updating cabin:', error);

        // ✅ Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A cabin with this name or number already exists for your vendor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update cabin',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// ✅ DELETE /api/cabins/:id - Delete cabin (with user cleanup)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('=== DELETE /api/cabins/:id ===');
        console.log('Cabin ID:', req.params.id);

        const { id } = req.params;

        // ✅ VALIDATION: Check if cabin exists
        const cabin = await Cabin.findById(id);

        if (!cabin) {
            return res.status(404).json({
                success: false,
                message: 'Cabin not found'
            });
        }

        // ✅ AUTHORIZATION: Check if vendor has permission
        if (req.user.role === 'vendor' && req.user.vendorId && cabin.vendorId.toString() !== req.user.vendorId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own cabins.'
            });
        }

        // ✅ Remove cabin assignment from all users
        try {
            const result = await User.updateMany(
                { cabinId: cabin._id },
                { $set: { cabinId: null } }
            );
            console.log(`✅ Removed cabin from ${result.modifiedCount} user(s)`);
        } catch (cleanupError) {
            console.error('⚠️ Error cleaning up user assignments:', cleanupError);
        }

        // ✅ Delete the cabin
        await Cabin.findByIdAndDelete(id);
        console.log('✅ Cabin deleted successfully');

        res.json({
            success: true,
            message: 'Cabin deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting cabin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete cabin',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

export default router;