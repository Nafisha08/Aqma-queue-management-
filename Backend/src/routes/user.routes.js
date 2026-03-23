// src/routes/user.routes.js - COMPLETE FIX FOR CABIN/COUNTER ASSIGNMENT
import { Router } from "express";
import jwt from 'jsonwebtoken';
import { User } from "../models/user.model.js";
import { Counter } from "../models/counter.js";
import { Cabin } from "../models/Cabin.js";
import mongoose from 'mongoose';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
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

const isVendor = (req, res, next) => {
    if (req.user.role !== 'vendor' && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Vendor privileges required.'
        });
    }
    next();
};

const authorizeUserManagement = (req, res, next) => {
    const { vendorId } = req.params;
    const user = req.user;

    if (user.role === 'superadmin') return next();
    if (user.role === 'admin') return next();

    if (user.role === 'vendor') {
        if (vendorId === 'null' && user.vendorId) {
            return res.status(403).json({ message: 'Vendors cannot manage global users' });
        }
        if (vendorId !== 'null' && user.vendorId !== vendorId) {
            return res.status(403).json({ message: 'Access denied. Can only manage own vendor users' });
        }
        return next();
    }

    return res.status(403).json({ message: 'Access denied. Insufficient privileges' });
}

// ✅ LOGIN - FIXED with proper userType handling
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find user and populate counter/cabin
        const user = await User.findOne({ username: username.toLowerCase() })
            .populate('counterId', 'name location')
            .populate('cabinId', 'name description');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.active) {
            return res.status(403).json({ message: 'Account is deactivated.' });
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('🔐 Login attempt for user:', username);
        console.log('📋 User data:', {
            userType: user.userType,
            counterId: user.counterId?._id,
            cabinId: user.cabinId?._id
        });

        // ✅ Create token payload with userType
        const tokenPayload = {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            userType: user.userType, // ✅ Include userType in token
            vendorId: user.vendorId ? user.vendorId.toString() : null,
            counterId: user.counterId ? user.counterId._id.toString() : null,
            cabinId: user.cabinId ? user.cabinId._id.toString() : null
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // ✅ Return complete user info with userType
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                userType: user.userType, // ✅ CRITICAL: Return userType
                vendorId: user.vendorId ? user.vendorId.toString() : null,
                counterId: user.counterId ? user.counterId._id.toString() : null,
                counterName: user.counterId ? user.counterId.name : null,
                cabinId: user.cabinId ? user.cabinId._id.toString() : null,
                cabinName: user.cabinId ? user.cabinId.name : null
            }
        });

        console.log('✅ Login successful for:', username, 'UserType:', user.userType);

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ✅ GET USER PROFILE - With proper population
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .populate('counterId', 'name location')
            .populate('cabinId', 'name description')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                userType: user.userType, // ✅ Include userType
                vendorId: user.vendorId ? user.vendorId.toString() : null,
                counterId: user.counterId ? user.counterId._id.toString() : null,
                counterName: user.counterId ? user.counterId.name : null,
                cabinId: user.cabinId ? user.cabinId._id.toString() : null,
                cabinName: user.cabinId ? user.cabinId.name : null
            }
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// ✅ CREATE USER - COMPLETE FIX
router.post('/vendor/:vendorId', authenticateToken, isVendor, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { name, username, password, role = 'user', counterId, cabinId, userType, metadata, phone } = req.body;

        console.log('=== CREATE USER START ===');
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

        if (!vendorId || !username) {
            return res.status(400).json({
                success: false,
                message: 'Vendor ID and username are required'
            });
        }

        // Convert 'null' string to null
        const actualVendorId = vendorId === 'null' ? null : vendorId;

        // Check for duplicate username
        const existingUser = await User.findOne({
            username: username.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this phone number'
            });
        }

        // ✅ CRITICAL FIX: Determine assignments based on userType
        const userTypes = Array.isArray(userType) ? userType : (userType ? [userType] : ['counter']);
        console.log('🎯 User types to assign:', userTypes);

        let assignedCounterId = null;
        let assignedCabinId = null;

        // ✅ CABIN USER - Only assign cabin
        if (userTypes.includes('cabin')) {
            console.log('🏠 Creating CABIN user');

            // Check if cabinId provided (for admin/superadmin)
            if (cabinId && cabinId !== '') {
                assignedCabinId = cabinId;
                console.log('✅ Using provided cabinId:', cabinId);
            }
            // Auto-assign for vendor
            else if (req.user.role === 'vendor') {
                const vendorCabin = await Cabin.findOne({
                    vendorId: actualVendorId,
                    isActive: true
                }).sort({ createdAt: -1 });

                if (vendorCabin) {
                    assignedCabinId = vendorCabin._id;
                    console.log('✅ Cabin auto-assigned:', vendorCabin.name);
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'No active cabin found. Please create a cabin first.'
                    });
                }
            }

            // ✅ CRITICAL: Set counterId to NULL for cabin users
            assignedCounterId = null;
            console.log('🧹 CounterId set to NULL for cabin user');
        }

        // ✅ COUNTER USER - Only assign counter
        else if (userTypes.includes('counter')) {
            console.log('🏪 Creating COUNTER user');

            // Check if counterId provided (for admin/superadmin)
            if (counterId && counterId !== '') {
                assignedCounterId = counterId;
                console.log('✅ Using provided counterId:', counterId);
            }
            // Auto-assign for vendor
            else if (req.user.role === 'vendor') {
                const vendorCounter = await Counter.findOne({
                    vendorId: actualVendorId,
                    status: 'active'
                }).sort({ createdAt: -1 });

                if (vendorCounter) {
                    assignedCounterId = vendorCounter._id;
                    console.log('✅ Counter auto-assigned:', vendorCounter.name);
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'No active counter found. Please create a counter first.'
                    });
                }
            }

            // ✅ CRITICAL: Set cabinId to NULL for counter users
            assignedCabinId = null;
            console.log('🧹 CabinId set to NULL for counter user');
        }

        // Validate ObjectIds
        if (assignedCounterId && !mongoose.Types.ObjectId.isValid(assignedCounterId)) {
            return res.status(400).json({ success: false, message: 'Invalid counter ID' });
        }
        if (assignedCabinId && !mongoose.Types.ObjectId.isValid(assignedCabinId)) {
            return res.status(400).json({ success: false, message: 'Invalid cabin ID' });
        }
        if (actualVendorId && !mongoose.Types.ObjectId.isValid(actualVendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }

        console.log('💾 Final assignments:', {
            userType: userTypes,
            counterId: assignedCounterId,
            cabinId: assignedCabinId
        });

        // ✅ CREATE USER with proper null handling
        const userData = {
            name: name || '',
            username: username.toLowerCase().trim(),
            password: password || '12345',
            role,
            vendorId: actualVendorId,
            counterId: assignedCounterId, // ✅ NULL for cabin users
            cabinId: assignedCabinId,     // ✅ NULL for counter users
            userType: userTypes,          // ✅ Save userType array
            metadata: metadata || {},
        };

        if (phone && phone.trim() !== '') {
            userData.phone = phone;
        }

        const user = new User(userData);
        const savedUser = await user.save();

        // Populate for response
        await savedUser.populate('counterId', 'name location');
        await savedUser.populate('cabinId', 'name description');

        console.log('✅ User created successfully:', {
            username: savedUser.username,
            userType: savedUser.userType,
            counter: savedUser.counterId?.name || 'None',
            cabin: savedUser.cabinId?.name || 'None'
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: savedUser._id.toString(),
                name: savedUser.name,
                username: savedUser.username,
                role: savedUser.role,
                userType: savedUser.userType, // ✅ Return userType
                counterId: savedUser.counterId?._id.toString(),
                counterName: savedUser.counterId?.name,
                cabinId: savedUser.cabinId?._id.toString(),
                cabinName: savedUser.cabinId?.name,
                email: savedUser.email,
                phone: savedUser.phone
            }
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ✅ UPDATE USER - COMPLETE FIX
router.put('/vendor/:vendorId/:userId', authenticateToken, authorizeUserManagement, async (req, res) => {
    try {
        const { vendorId, userId } = req.params;
        const { name, username, password, role, counterId, cabinId, userType, metadata, email, phone, isActive } = req.body;

        console.log('=== UPDATE USER START ===');
        console.log('📥 Update request:', JSON.stringify(req.body, null, 2));

        if (!vendorId || !userId) {
            return res.status(400).json({ message: 'Vendor ID and User ID are required' });
        }

        let queryVendorId = vendorId === 'null' ? null : vendorId;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (username) updateData.username = username.toLowerCase();
        if (password) updateData.password = password;
        if (role) updateData.role = role;
        if (metadata !== undefined) updateData.metadata = metadata;
        if (email !== undefined) updateData.email = email ? email.toLowerCase() : undefined;
        if (phone !== undefined) updateData.phone = phone;
        if (isActive !== undefined) updateData.active = isActive;

        // ✅ CRITICAL FIX: Handle userType update
        if (userType !== undefined) {
            const userTypes = Array.isArray(userType) ? userType : [userType];
            updateData.userType = userTypes;

            console.log('🔄 Updating userType to:', userTypes);

            // ✅ Clear opposite assignment based on new userType
            if (userTypes.includes('cabin')) {
                // Switching to cabin - clear counter, set cabin
                updateData.counterId = null;
                if (cabinId !== undefined) {
                    updateData.cabinId = (cabinId === '' || cabinId === null) ? null : cabinId;
                }
                console.log('🏠 Switching to CABIN - cleared counterId');
            } else if (userTypes.includes('counter')) {
                // Switching to counter - clear cabin, set counter
                updateData.cabinId = null;
                if (counterId !== undefined) {
                    updateData.counterId = (counterId === '' || counterId === null) ? null : counterId;
                }
                console.log('🏪 Switching to COUNTER - cleared cabinId');
            }
        } else {
            // If userType not provided, handle counter/cabin updates separately
            if (counterId !== undefined) {
                updateData.counterId = (counterId === '' || counterId === null) ? null : counterId;
                if (counterId !== '' && counterId !== null) {
                    updateData.cabinId = null; // Clear cabin when assigning counter
                }
            }
            if (cabinId !== undefined) {
                updateData.cabinId = (cabinId === '' || cabinId === null) ? null : cabinId;
                if (cabinId !== '' && cabinId !== null) {
                    updateData.counterId = null; // Clear counter when assigning cabin
                }
            }
        }

        console.log('💾 Final update data:', JSON.stringify(updateData, null, 2));

        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, vendorId: queryVendorId },
            updateData,
            { new: true }
        )
            .populate('counterId', 'name location')
            .populate('cabinId', 'name description')
            .select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('✅ User updated:', {
            username: updatedUser.username,
            userType: updatedUser.userType,
            counter: updatedUser.counterId?.name || 'None',
            cabin: updatedUser.cabinId?.name || 'None'
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                username: updatedUser.username,
                role: updatedUser.role,
                userType: updatedUser.userType, // ✅ Return userType
                counterId: updatedUser.counterId?._id.toString(),
                counterName: updatedUser.counterId?.name,
                cabinId: updatedUser.cabinId?._id.toString(),
                cabinName: updatedUser.cabinId?.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                isActive: updatedUser.active
            }
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// ✅ GET USERS LIST - With proper population and userType
router.get('/vendor/:vendorId', authenticateToken, authorizeUserManagement, async (req, res) => {
    try {
        const { vendorId } = req.params;

        if (!vendorId) {
            return res.status(400).json({ message: 'Vendor ID is required' });
        }

        let query = { active: true };
        if (vendorId === 'null') {
            query.vendorId = null;
        } else {
            query.vendorId = vendorId;
        }

        const users = await User.find(query)
            .populate('counterId', 'name location')
            .populate('cabinId', 'name description')
            .select('-password');

        res.status(200).json({
            success: true,
            users: users.map(user => ({
                id: user._id.toString(),
                name: user.name,
                username: user.username,
                role: user.role,
                userType: user.userType, // ✅ Include userType
                counterId: user.counterId?._id.toString(),
                counterName: user.counterId?.name,
                cabinId: user.cabinId?._id.toString(),
                cabinName: user.cabinId?.name,
                metadata: user.metadata,
                email: user.email,
                phone: user.phone,
                isActive: user.active
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// DELETE USER
router.delete('/vendor/:vendorId/:userId', authenticateToken, authorizeUserManagement, async (req, res) => {
    try {
        const { vendorId, userId } = req.params;

        if (!vendorId || !userId) {
            return res.status(400).json({ message: 'Vendor ID and User ID are required' });
        }

        let queryVendorId = vendorId === 'null' ? null : vendorId;

        const deletedUser = await User.findOneAndDelete({
            _id: userId,
            vendorId: queryVendorId
        });

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// LOGOUT
router.post("/logout", (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;