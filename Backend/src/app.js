import dotenv from 'dotenv';
dotenv.config(); // ⬅️ MUST BE FIRST LINE BEFORE ANY OTHER IMPORTS

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import {
    User,
    Vendor,
    SubscriptionPlan,
    VendorSubscription,
    Counter,
    Item,
    Token,
    Payment,
    Cabin
} from './models/model.js' // Make sure this path is correct

import { DailyCounter } from './models/DailyCounter.js'
import smsService from './utils/smsService.js'

// ✅ CORRECT
import {
    authenticateToken,
    isVendor,
    isSuperAdmin,
    isAdminOrReceptionist
} from './middlewares/auth.js'
const app = express()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key'
console.log('🔑 App.js JWT_SECRET:', JWT_SECRET)

// ===== MIDDLEWARE SETUP (CRITICAL ORDER) =====

// CORS MUST be first
app.use(cors({
    origin: [
        process.env.CORS_ORIGIN,
        'https://aqma-queue-management.vercel.app',  // 👈 ADD THIS
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:3000'
    ].filter(Boolean),

    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'user-role', 'x-requested-with'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

// Body parsing middleware MUST be after CORS and before routes
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - Body:`, req.body);
    next();
});

// Helper function to generate token ID
function generateTokenId() {
    const timestamp = Date.now().toString().slice(-3);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `T${timestamp}${random}`;
}

// ✅ FIXED: Helper function to generate daily token ID per counter
async function generateDailyTokenId(counterId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Validate counterId
    if (!counterId) {
        throw new Error('Counter ID is required to generate daily token ID');
    }

    // Get counter details to extract counterNumber
    const counter = await Counter.findById(counterId);
    if (!counter) {
        throw new Error('Counter not found');
    }

    // Extract counter number from counter name (e.g., "Counter 1" -> 1)
    let counterNumber = 1;
    const match = counter.name.match(/(\d+)/);
    if (match) {
        counterNumber = parseInt(match[1]);
    }

    console.log('📊 generateDailyTokenId - Counter:', counter.name, 'Number:', counterNumber);

    // ✅ ATOMIC OPERATION: Use findOneAndUpdate with upsert
    const dailyCounter = await DailyCounter.findOneAndUpdate(
        {
            counterId: counterId,  // ✅ Search by counterId (matches unique index)
            date: today
        },
        {
            $inc: { lastTokenNumber: 1 },  // Increment token number
            $setOnInsert: {  // Set these only if creating new document
                counterId: counterId,
                counterNumber: counterNumber,
                date: today
            }
        },
        {
            upsert: true,         // Create if doesn't exist
            new: true,            // Return updated document
            runValidators: true   // Run schema validators
        }
    );

    console.log('✅ Daily token ID generated:', dailyCounter.lastTokenNumber);

    return dailyCounter.lastTokenNumber.toString().padStart(2, '0');
}



// ===== BASIC API ROUTES =====

app.get('/api/', (req, res) => {
    res.json({
        message: 'Token Management System API is working',
        version: '1.0.0',
        endpoints: [
            '/api/auth/login',
            '/api/tokens/active',
            '/api/tokens',
            '/api/tokens/history',
            '/api/tokens/stats',
            '/api/subscription-plans',
            '/api/vendor-subscriptions',
            // Add vendor endpoints
            "GET /api/vendors",
            "POST /api/vendors",
            "GET /api/vendors/stats/summary",
            "GET /api/vendors/:id",
            "PUT /api/vendors/:id",
            "DELETE /api/vendors/:id"
        ]
    });
});

// Enhanced health check route
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const dbTest = await User.findOne().limit(1);

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'Connected',
            jwt: !!JWT_SECRET,
            environment: process.env.NODE_ENV || 'development',
            routes: {
                auth: '/api/auth/login',
                tokens: '/api/tokens',
                activeTokens: '/api/tokens/active',
                tokenHistory: '/api/tokens/history',
                tokenStats: '/api/tokens/stats'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            error: error.message
        });
    }
});

// Add both /test and /api/test routes
app.get('/test', (req, res) => {
    res.json({
        message: 'Token Management System working!',
        database: 'MongoDB Atlas connected',
        timestamp: new Date().toISOString(),
        jwtSecretExists: !!JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        endpoint: '/test'
    })
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API Test endpoint working!',
        database: 'MongoDB Atlas connected',
        timestamp: new Date().toISOString(),
        jwtSecretExists: !!JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        endpoint: '/api/test'
    })
});

// ===== AUTHENTICATION ROUTES (HIGH PRIORITY - DEFINE FIRST) =====

// Login endpoint - ENHANCED WITH DEBUGGING
// ===== AUTHENTICATION ROUTES (HIGH PRIORITY - DEFINE FIRST) =====

// Login endpoint - ENHANCED WITH userType support
// ✅ FIXED LOGIN ROUTE with userType support
app.post('/api/auth/login', async (req, res) => {
    try {
        // Check if req.body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                message: 'Request body is empty. Make sure Content-Type is application/json',
                received: req.body
            });
        }

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // ✅ CRITICAL: Populate cabinId and counterId
        const user = await User.findOne({ username: username.toLowerCase() })
            .populate('cabinId', 'name description cabinNumber')
            .populate('counterId', 'name location counterNumber');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.active) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Verify password using the model method
        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('🔐 Login attempt:', {
            username: user.username,
            userType: user.userType,
            role: user.role,
            cabinId: user.cabinId?._id,
            cabinNumber: user.cabinId?.cabinNumber,
            counterId: user.counterId?._id,
            counterNumber: user.counterId?.counterNumber
        });

        // ✅ CRITICAL: Generate JWT token WITH userType
        const tokenPayload = {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            userType: user.userType, // ✅ CRITICAL: Include userType array
            vendorId: user.vendorId ? user.vendorId.toString() : null,
            cabinId: user.cabinId ? user.cabinId._id.toString() : null,
            counterId: user.counterId ? user.counterId._id.toString() : null
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // ✅ CRITICAL: Return complete user info with userType and cabin/counter numbers
        const responseData = {
            message: 'Login successful',
            token: token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                userType: user.userType, // ✅ CRITICAL: Return userType array
                vendorId: user.vendorId ? user.vendorId.toString() : null,

                // ✅ Cabin info
                cabinId: user.cabinId ? user.cabinId._id.toString() : null,
                cabinName: user.cabinId ? user.cabinId.name : null,
                cabinNumber: user.cabinId ? user.cabinId.cabinNumber : null,

                // ✅ Counter info
                counterId: user.counterId ? user.counterId._id.toString() : null,
                counterName: user.counterId ? user.counterId.name : null,
                counterNumber: user.counterId ? user.counterId.counterNumber : null
            }
        };

        console.log('✅ Login successful:', {
            username: user.username,
            role: user.role,
            userType: user.userType,
            hasCabin: !!user.cabinId,
            hasCounter: !!user.counterId
        });

        res.status(200).json(responseData);

    } catch (error) {
        console.error('❌ DETAILED LOGIN ERROR:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
});

// Validate token endpoint
app.post('/api/auth/validate-token', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            valid: false,
            message: 'No token provided'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                valid: false,
                message: 'Invalid or expired token'
            });
        }

        res.json({
            valid: true,
            message: 'Token is valid',
            user: {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role,
                vendorId: decoded.vendorId
            }
        });
    });
});

// ===== IMPORTED ROUTERS (AFTER AUTH ROUTES) =====

// Import routes
import userRouter from './routes/user.routes.js'
import userAssignmentRouter from './routes/user.assignment.routes.js'
import academicCellRouter from './routes/academicCell.routes.js'
import vendorRouter from './routes/vendor.routes.js'
import cabinRouter from './routes/cabin.routes.js'
import tokenRouter from './routes/token.routes.js'
import counterRouter from './routes/counter.routes.js'
// Register user routes (must be before direct /api/users route)
app.use("/api/users", userRouter)
app.use("/api/users", userAssignmentRouter)
app.use("/api/academic-cell", academicCellRouter)
app.use("/api/vendor-management", vendorRouter)
app.use("/api/cabins", cabinRouter)
app.use("/api/tokens", tokenRouter)
app.use("/api/counters", counterRouter) // ✅ ADD THIS LINE




// ===== DEBUG ROUTES =====

app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        console.log('Debug: Users in database:', users.length);
        res.json({
            message: 'Users in database',
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug/reset-vendor-password', async (req, res) => {
    try {
        const vendorUser = await User.findOne({ username: 'vendor' });
        if (!vendorUser) {
            return res.status(404).json({ message: 'Vendor user not found' });
        }

        vendorUser.password = 'vendor123';
        await vendorUser.save();

        res.json({
            message: 'Vendor password reset successfully',
            user: {
                id: vendorUser._id,
                username: vendorUser.username,
                role: vendorUser.role
            }
        });
    } catch (error) {
        console.error('Error resetting vendor password:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fix-login', async (req, res) => {
    try {
        const superadmin = await User.findOne({ username: 'superadmin' });
        if (superadmin) {
            superadmin.password = 'superadmin123';
            await superadmin.save();
        }

        const user = await User.findOne({ username: 'user' });
        if (user) {
            user.password = 'user123';
            await user.save();
        }

        const vendor = await User.findOne({ username: 'vendor' });
        if (vendor) {
            vendor.password = 'vendor123';
            await vendor.save();
        }

        res.json({ message: 'All passwords fixed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== SUBSCRIPTION MANAGEMENT ROUTES =====

app.get('/api/subscription-plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ status: 'active' }).sort({ price: 1 });
        res.json(plans);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plans',
            error: error.message
        });
    }
});

app.post('/api/subscription-plans', isSuperAdmin, async (req, res) => {
    try {
        const { name, description, price, duration, features, maxTokens, active } = req.body;

        const plan = new SubscriptionPlan({
            name,
            description,
            price,
            duration,
            features,
            maxTokens,
            status: active !== undefined ? (active ? 'active' : 'inactive') : 'active'
        });

        const savedPlan = await plan.save();

        res.status(201).json({
            success: true,
            message: 'Subscription plan created successfully',
            plan: savedPlan
        });
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscription plan',
            error: error.message
        });
    }
});

app.put('/api/subscription-plans/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan ID'
            });
        }

        const plan = await SubscriptionPlan.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }

        res.json({
            success: true,
            message: 'Subscription plan updated successfully',
            plan
        });
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription plan',
            error: error.message
        });
    }
});

app.delete('/api/subscription-plans/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan ID'
            });
        }

        const plan = await SubscriptionPlan.findByIdAndDelete(id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }

        res.json({
            success: true,
            message: 'Subscription plan deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting subscription plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete subscription plan',
            error: error.message
        });
    }
});

app.get('/api/vendor-subscriptions', authenticateToken, async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'vendor') {
            const vendor = await Vendor.findOne({ _id: req.user.vendorId });
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            query.vendorId = vendor._id;
        }

        const subscriptions = await VendorSubscription.find(query)
            .populate('vendorId', 'name email')
            .populate('planId', 'name price duration')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            subscriptions
        });
    } catch (error) {
        console.error('Error fetching vendor subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
});

app.post('/api/vendor-subscriptions', isVendor, async (req, res) => {
    try {
        const { planId } = req.body;

        const vendor = await Vendor.findOne({ _id: req.user.vendorId });
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }

        const existingSubscription = await VendorSubscription.findOne({
            vendorId: vendor._id,
            status: 'active'
        });

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'Vendor already has an active subscription'
            });
        }

        const subscription = new VendorSubscription({
            vendorId: vendor._id,
            planId: plan._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + (plan.duration * 24 * 60 * 60 * 1000)),
            status: 'active',
            tokensUsed: 0,
            maxTokens: plan.maxTokens
        });

        await subscription.save();

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription
        });
    } catch (error) {
        console.error('Error creating vendor subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscription',
            error: error.message
        });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

app.get('/api/vendors', authenticateToken, async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const vendors = await Vendor.find({}).sort({ createdAt: -1 });

        res.json({
            success: true,
            vendors
        });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendors',
            error: error.message
        });
    }
});

// ===== COUNTER MANAGEMENT ROUTES =====

app.get('/api/counters', authenticateToken, async (req, res) => {
    try {
        let query = {};

        // If vendor, only show their counters
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }

        const counters = await Counter.find(query)
            .populate('vendorId', 'name')
            .populate('cabinId', 'name')
            .sort({ counterNumber: 1 });

        res.json({
            success: true,
            counters
        });
    } catch (error) {
        console.error('Error fetching counters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counters',
            error: error.message
        });
    }
});

app.post('/api/counters', authenticateToken, async (req, res) => {
    try {
    const { name, location, purpose, type, vendorId, cabinId } = req.body;

        // Determine vendorId to use - auto-populate from authenticated user
        let finalVendorId = vendorId;
        if (req.user.role === 'vendor') {
            finalVendorId = req.user.vendorId;
        }

        const counter = new Counter({
            name,
            location,
            purpose,
            type: type || 'general', // Default to 'general' if not provided
            vendorId: finalVendorId,
            cabinId: cabinId || null,
            status: 'active',
            createdBy: req.user.id
        });

        const savedCounter = await counter.save();

        res.status(201).json({
            success: true,
            message: 'Counter created successfully',
            counter: savedCounter
        });
    } catch (error) {
        console.error('Error creating counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create counter',
            error: error.message
        });
    }
});

// PUT /api/counters/:id - Update counter
app.put('/api/counters/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
    const { name, location, purpose, type, status, cabinId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid counter ID'
            });
        }

        let query = { _id: id };

        // If vendor, ensure they can only update their own counters
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (location !== undefined) updateData.location = location;
        if (purpose !== undefined) updateData.purpose = purpose;
        if (type !== undefined) updateData.type = type;
    if (cabinId !== undefined) updateData.cabinId = cabinId;
        if (status !== undefined) updateData.status = status;

        const updatedCounter = await Counter.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCounter) {
            return res.status(404).json({
                success: false,
                message: 'Counter not found or access denied'
            });
        }

        res.json({
            success: true,
            message: 'Counter updated successfully',
            counter: updatedCounter
        });
    } catch (error) {
        console.error('Error updating counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update counter',
            error: error.message
        });
    }
});

// DELETE /api/counters/:id - Delete counter
app.delete('/api/counters/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid counter ID'
            });
        }

        let query = { _id: id };

        // If vendor, ensure they can only delete their own counters
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }

        const deletedCounter = await Counter.findOneAndDelete(query);

        if (!deletedCounter) {
            return res.status(404).json({
                success: false,
                message: 'Counter not found or access denied'
            });
        }

        res.json({
            success: true,
            message: 'Counter deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete counter',
            error: error.message
        });
    }
});

// DELETE /api/debug/cleanup-invalid-counters - Enhanced cleanup invalid counters
app.delete('/api/debug/cleanup-invalid-counters', authenticateToken, async (req, res) => {
    try {
        console.log('=== DELETE /api/debug/cleanup-invalid-counters ===');
        console.log('User:', req.user);
        console.log('Query params:', req.query);

        const { dryRun = 'false', detailed = 'false' } = req.query;
        const isDryRun = dryRun === 'true';
        const isDetailed = detailed === 'true';

        console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'ACTUAL DELETION'}`);

        // Define comprehensive invalid counter patterns
        const invalidPatterns = [
            // Pattern 1: Completely empty counters
            {
                name: '',
                location: '',
                purpose: '',
                type: 'general',
                status: 'active'
            },
            // Pattern 2: Counters with empty name but other fields filled
            {
                name: '',
                location: { $ne: '' },
                purpose: { $ne: '' }
            },
            // Pattern 3: Counters without required name field
            {
                $or: [
                    { name: { $exists: false } },
                    { name: null },
                    { name: '' }
                ]
            },
            // Pattern 4: Invalid counter numbers (non-numeric strings)
            {
                counterNumber: { $type: 'string', $regex: /[^0-9]/ }
            },
            // Pattern 5: Negative or zero counter numbers
            {
                counterNumber: { $lte: 0 }
            },
            // Pattern 6: Missing required location field
            {
                $or: [
                    { location: { $exists: false } },
                    { location: null },
                    { location: '' }
                ]
            },
            // Pattern 7: Invalid status values
            {
                status: { $nin: ['active', 'inactive', 'maintenance'] }
            },
            // Pattern 8: Invalid type values
            {
                type: { $nin: ['general', 'priority', 'vip', 'express'] }
            },
            // Pattern 9: Counters without _id field (shouldn't exist in MongoDB but apparently do)
            {
                _id: { $exists: false }
            },
            // Pattern 10: Counters with null _id
            {
                _id: null
            },
            // Pattern 11: Counters with undefined _id (though this shouldn't happen)
            {
                _id: { $type: 'undefined' }
            }
        ];

        let totalAffected = 0;
        const cleanupResults = [];
        const detailedFindings = isDetailed ? [] : null;

        // Process each invalid pattern
        for (let i = 0; i < invalidPatterns.length; i++) {
            const pattern = invalidPatterns[i];
            try {
                console.log(`Checking pattern ${i + 1}:`, JSON.stringify(pattern, null, 2));

                // First, count how many would be affected
                const count = await Counter.countDocuments(pattern);
                console.log(`Pattern ${i + 1} matches ${count} counters`);

                if (count > 0) {
                    if (isDetailed) {
                        // Get detailed info about matching counters
                        const matchingCounters = await Counter.find(pattern)
                            .populate('vendorId', 'name')
                            .limit(10); // Limit for performance
                        detailedFindings.push({
                            patternIndex: i + 1,
                            pattern,
                            count,
                            sampleCounters: matchingCounters.map(c => ({
                                id: c._id,
                                name: c.name,
                                counterNumber: c.counterNumber,
                                location: c.location,
                                status: c.status,
                                vendorName: c.vendorId?.name || 'No vendor'
                            }))
                        });
                    }

                    if (!isDryRun) {
                        // Actually delete the counters
                        const deleteResult = await Counter.deleteMany(pattern);
                        const deletedCount = deleteResult.deletedCount;
                        totalAffected += deletedCount;
                        console.log(`Deleted ${deletedCount} counters for pattern ${i + 1}`);
                    } else {
                        totalAffected += count;
                    }
                }

                cleanupResults.push({
                    patternIndex: i + 1,
                    pattern: JSON.stringify(pattern),
                    affectedCount: count,
                    status: isDryRun ? 'would_delete' : (count > 0 ? 'deleted' : 'no_matches')
                });

            } catch (error) {
                console.error(`Error processing pattern ${i + 1}:`, error);
                cleanupResults.push({
                    patternIndex: i + 1,
                    pattern: JSON.stringify(pattern),
                    error: error.message,
                    status: 'error'
                });
            }
        }

        // Additional validation: Check for counters with invalid vendor references
        try {
            console.log('Checking for counters with invalid vendor references...');

            // Find counters where vendorId exists but doesn't reference a valid vendor
            const countersWithInvalidVendor = await Counter.aggregate([
                {
                    $lookup: {
                        from: 'vendors', // Assuming vendors collection name
                        localField: 'vendorId',
                        foreignField: '_id',
                        as: 'vendor'
                    }
                },
                {
                    $match: {
                        vendorId: { $exists: true, $ne: null },
                        vendor: { $size: 0 } // No matching vendor found
                    }
                }
            ]);

            const invalidVendorCount = countersWithInvalidVendor.length;
            console.log(`Found ${invalidVendorCount} counters with invalid vendor references`);

            if (invalidVendorCount > 0) {
                if (isDetailed) {
                    detailedFindings.push({
                        type: 'invalid_vendor_references',
                        count: invalidVendorCount,
                        sampleCounters: countersWithInvalidVendor.slice(0, 5).map(c => ({
                            id: c._id,
                            name: c.name,
                            invalidVendorId: c.vendorId
                        }))
                    });
                }

                if (!isDryRun) {
                    // Delete counters with invalid vendor references
                    const deleteResult = await Counter.deleteMany({
                        _id: { $in: countersWithInvalidVendor.map(c => c._id) }
                    });
                    console.log(`Deleted ${deleteResult.deletedCount} counters with invalid vendor references`);
                    totalAffected += deleteResult.deletedCount;
                } else {
                    totalAffected += invalidVendorCount;
                }

                cleanupResults.push({
                    type: 'invalid_vendor_references',
                    affectedCount: invalidVendorCount,
                    status: isDryRun ? 'would_delete' : 'deleted'
                });
            }

        } catch (error) {
            console.error('Error checking invalid vendor references:', error);
            cleanupResults.push({
                type: 'invalid_vendor_references',
                error: error.message,
                status: 'error'
            });
        }

        // Generate summary statistics
        const summary = {
            mode: isDryRun ? 'dry_run' : 'actual_deletion',
            totalAffected,
            patternsProcessed: invalidPatterns.length,
            timestamp: new Date().toISOString(),
            processedBy: req.user.username
        };

        console.log('Cleanup completed:', summary);

        const response = {
            success: true,
            message: isDryRun
                ? `Dry run completed. ${totalAffected} counters would be deleted.`
                : `Cleanup completed successfully. ${totalAffected} invalid counters removed.`,
            summary,
            results: cleanupResults
        };

        if (isDetailed && detailedFindings) {
            response.detailedFindings = detailedFindings;
        }

        // Add usage instructions
        response.usage = {
            dryRun: 'Add ?dryRun=true to preview what would be deleted',
            detailed: 'Add ?detailed=true for sample data of affected counters',
            example: '/api/debug/cleanup-invalid-counters?dryRun=true&detailed=true'
        };

        res.json(response);

    } catch (error) {
        console.error('Error cleaning up invalid counters:', error);
        console.error('Error details:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup invalid counters',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


// GET /api/items - Fetch all items (with proper vendor filtering)
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        let query = { status: 'active' }; // Only show active items

        // Authorization check: users can only access items for their own vendor
        // Superadmin and admin can access any vendor's items
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            if (!user.vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. No vendor association found.'
                });
            }
            query.vendorId = user.vendorId;
        }

        const items = await Item.find(query)
            .populate('vendorId', 'companyName')
            .sort({ name: 1 });

        // Format items to match the expected structure
        const formattedItems = items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            vendorId: item.vendorId?._id.toString(),
            vendorName: item.vendorId?.companyName,
            status: item.status,
            createdAt: item.createdAt
        }));

        res.json({
            success: true,
            items: formattedItems
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch items',
            error: error.message
        });
    }
});

// POST /api/items - Create new item
app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        const { name, description, price, category, vendorId } = req.body;

        // Determine vendorId to use
        let finalVendorId = vendorId;
        if (req.user.role === 'vendor') {
            finalVendorId = req.user.vendorId;
        }

        const item = new Item({
            name,
            description,
            price: price !== undefined ? parseFloat(price) : 0,
            category,
            vendorId: finalVendorId,
            status: 'active',
            createdBy: req.user.id
        });

        const savedItem = await item.save();

        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            item: savedItem
        });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create item',
            error: error.message
        });
    }
});

// PUT /api/items/:id - Update item
app.put('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        console.log('=== PUT /api/items/:id ===');
        console.log('Item ID:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { id } = req.params;
        const { name, description, price, category, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item ID'
            });
        }

        let query = { _id: id };

        // If vendor, ensure they can only update their own items
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price !== null ? parseFloat(price) : 0;
        if (category !== undefined) updateData.category = category;
        if (status !== undefined) updateData.status = status;

        const updatedItem = await Item.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        ).populate('vendorId', 'name');

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found or access denied'
            });
        }

        res.json({
            success: true,
            message: 'Item updated successfully',
            item: updatedItem
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item',
            error: error.message
        });
    }
});

// ✅ FIXED: DELETE /api/items/:id - Delete item
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        console.log('=== DELETE /api/items/:id ===');
        console.log('Item ID:', req.params.id);
        console.log('User:', req.user);
        console.log('Headers:', req.headers);

        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid ObjectId format:', id);
            return res.status(400).json({
                success: false,
                message: 'Invalid item ID format'
            });
        }

        let query = { _id: id };

        // If vendor, ensure they can only delete their own items
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
            console.log('Vendor query:', query);
        }

        console.log('Finding item with query:', query);
        const deletedItem = await Item.findOneAndDelete(query);

        if (!deletedItem) {
            console.log('Item not found or access denied');
            return res.status(404).json({
                success: false,
                message: 'Item not found or access denied'
            });
        }

        console.log('Item deleted successfully:', deletedItem._id);

        res.json({
            success: true,
            message: 'Item deleted successfully',
            deletedItem: {
                id: deletedItem._id,
                name: deletedItem.name
            }
        });
    } catch (error) {
        console.error('Error deleting item:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to delete item',
            error: error.message
        });
    }
});
// Send SMS endpoint
app.post('/api/send-sms', authenticateToken, async (req, res) => {
    try {
        console.log('=== POST /api/send-sms ===');
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { mobileNo, tokenId, customerName, counterNumber, estimatedWaitTime, amount } = req.body;

        // Validate required fields
        if (!mobileNo || !tokenId || !customerName || !counterNumber || !estimatedWaitTime || !amount) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: mobileNo, tokenId, customerName, counterNumber, estimatedWaitTime, amount'
            });
        }

        // Validate mobile number format (Indian mobile numbers)
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobileNo)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number format. Must be 10 digits starting with 6-9'
            });
        }

        // Prepare token data for SMS
        const tokenData = {
            tokenId,
            customerName,
            counterNumber,
            estimatedWaitTime,
            amount: parseFloat(amount)
        };

        console.log('Sending SMS with data:', tokenData);

        // Send SMS using the service
        const smsResult = await smsService.sendTokenSMS(mobileNo, tokenData);

        console.log('SMS result:', smsResult);

        if (smsResult.success) {
            res.json({
                success: true,
                message: 'SMS sent successfully',
                smsResult
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send SMS',
                error: smsResult.message
            });
        }

    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send SMS',
            error: error.message
        });
    }
});

// ===== PAYMENT ROUTES =====

app.get('/api/payments', authenticateToken, async (req, res) => {
    try {
        let query = {};

        // If vendor, only show their payments
        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
        }

        const payments = await Payment.find(query)
            .populate('vendorId', 'name')
            .populate('planId', 'name price')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
            error: error.message
        });
    }
});



// ===== ERROR HANDLING =====

// Updated 404 handler for undefined routes
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /api/',
            'GET /api/health',
            'GET /test',
            'GET /api/test',
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'POST /api/auth/validate-token',
            'GET /api/tokens/active',
            'GET /api/tokens/history',
            'GET /api/tokens/stats',
            'GET /api/tokens/:tokenId',
            'POST /api/tokens',
            'PUT /api/tokens/:tokenId',
            'DELETE /api/tokens/:tokenId',
            'GET /api/subscription-plans',
            'GET /api/vendor-subscriptions',
            'GET /api/counters',
            'GET /api/items',
            'GET /api/payments'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Server error'
    });
});

app.get('/api/debug/db-test', async (req, res) => {
    try {
        console.log('Testing database connection...');
        const userCount = await User.countDocuments();
        const testUser = await User.findOne();

        res.json({
            message: 'Database test completed',
            userCount,
            sampleUserExists: !!testUser,
            jwtSecretExists: !!JWT_SECRET
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            message: 'Database test failed',
            error: error.message
        });
    }
});

app.post('/api/debug/create-vendor-user', async (req, res) => {
    try {
        const existingVendorUser = await User.findOne({ username: 'vendor' });
        if (existingVendorUser) {
            return res.json({ message: 'Vendor user already exists' });
        }

        let vendor = await Vendor.findOne({ email: 'demo@vendor.com' });

        if (!vendor) {
            vendor = await Vendor.create({
                name: 'Demo Vendor',
                gender: 'Male',
                email: 'demo@vendor.com',
                phone: '123-456-7890',
                address: '123 Vendor St, City',
                gstNo: 'GST123456789',
                active: true,
                categoryId: 1
            });
        }

        const vendorUser = new User({
            username: 'vendor',
            password: 'vendor123',
            role: 'vendor',
            vendorId: vendor._id,
            email: 'vendor@example.com'
        });

        const savedVendorUser = await vendorUser.save();

        res.json({
            message: 'Vendor user created successfully',
            user: {
                id: savedVendorUser._id,
                username: savedVendorUser.username,
                role: savedVendorUser.role,
                vendorId: savedVendorUser.vendorId
            }
        });
    } catch (error) {
        console.error('Error creating vendor user:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug/create-superadmin-user', async (req, res) => {
    try {
        const existingSuperAdmin = await User.findOne({ username: 'superadmin' });
        if (existingSuperAdmin) {
            return res.json({ message: 'Superadmin user already exists' });
        }

        const superAdminUser = new User({
            username: 'superadmin',
            password: 'superadmin123',
            role: 'superadmin',
            email: 'superadmin@example.com'
        });

        const savedSuperAdmin = await superAdminUser.save();

        res.json({
            message: 'Superadmin user created successfully',
            user: {
                id: savedSuperAdmin._id,
                username: savedSuperAdmin.username,
                role: savedSuperAdmin.role
            }
        });
    } catch (error) {
        console.error('Error creating superadmin user:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/debug/create-user', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: 'user' });
        if (existingUser) {
            return res.json({ message: 'User already exists' });
        }

        const user = new User({
            username: 'user',
            password: 'user123',
            role: 'user',
            email: 'user@example.com'
        });

        const savedUser = await user.save();

        res.json({
            message: 'User created successfully',
            user: {
                id: savedUser._id,
                username: savedUser.username,
                role: savedUser.role
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== QUICK SETUP ENDPOINT =====

// Quick setup endpoint - Auto-assign vendor/cabin/counter to user
app.post('/api/debug/quick-setup-user', authenticateToken, async (req, res) => {
    try {
        console.log('=== Quick Setup User ===');

        const userId = req.user.id;

        // 1. Find or create a default Vendor
        let vendor = await Vendor.findOne({ active: true });
        if (!vendor) {
            console.log('Creating default vendor...');
            vendor = new Vendor({
                name: 'Default Vendor',
                contactPerson: 'Admin',
                companyName: 'Default Company',
                gender: 'Male',
                email: 'vendor@example.com',
                phone: '1234567890',
                address: 'Default Address',
                gstNo: 'GST123456789',
                active: true,
                categoryId: 1
            });
            await vendor.save();
            console.log('✅ Vendor created:', vendor._id);
        }

        // 2. Find or create a default Cabin (linked to vendor)
        let cabin = await Cabin.findOne({ vendorId: vendor._id, isActive: true });
        if (!cabin) {
            console.log('Creating default cabin...');
            cabin = new Cabin({
                name: 'Cabin-A',
                description: 'Main Service Cabin',
                isActive: true,
                vendorId: vendor._id
            });
            await cabin.save();
            console.log('✅ Cabin created:', cabin._id);
        }

        // 3. Find or create a default Counter (linked to vendor and cabin)
        let counter = await Counter.findOne({ vendorId: vendor._id, cabinId: cabin._id, status: 'active' });
        if (!counter) {
            console.log('Creating default counter...');
            counter = new Counter({
                name: 'Counter-1',
                location: 'Main Hall',
                purpose: 'General Service',
                type: 'general',
                status: 'active',
                vendorId: vendor._id,
                cabinId: cabin._id
            });
            await counter.save();
            console.log('✅ Counter created:', counter._id);
        }

        // 4. Assign all three to user
        const user = await User.findByIdAndUpdate(
            userId,
            {
                vendorId: vendor._id,
                cabinId: cabin._id,
                counterId: counter._id
            },
            { new: true }
        ).populate(['vendorId', 'cabinId', 'counterId']);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User assignments updated');

        // 5. Generate new JWT token with updated user data
        const tokenPayload = {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            vendorId: user.vendorId ? user.vendorId.toString() : null,
            cabinId: user.cabinId ? user.cabinId.toString() : null,
            counterId: user.counterId ? user.counterId.toString() : null
        };

        const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        console.log('✅ New JWT token generated');

        // 6. Return success response with new token
        res.json({
            success: true,
            message: 'User setup completed successfully',
            data: {
                user: {
                    id: user._id.toString(),
                    username: user.username
                },
                assignments: {
                    vendorId: vendor._id.toString(),
                    vendorName: vendor.name,
                    cabinId: cabin._id.toString(),
                    cabinName: cabin.name,
                    counterId: counter._id.toString(),
                    counterName: counter.name
                },
                newToken: newToken
            }
        });

    } catch (error) {
        console.error('❌ Error in quick setup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to setup user',
            error: error.message
        });
    }
});

export { app }