// src/routes/token.routes.js - Token Management API (FIXED VERSION)
import { Router } from "express";
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Token, User, Vendor, Collection, Counter } from "../models/model.js";
import { DailyCounter } from "../models/DailyCounter.js";
import SmsService from "../utils/smsService.js";
import { Cabin } from "../models/Cabin.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Utility function to get current UTC time (store as UTC, display as IST)
function getISTTime() {
    return new Date();
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

function generateTokenId() {
    const prefix = 'T';
    const timestamp = Date.now().toString().slice(-3);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// ✅ FIXED: Duplicate entry prevention with validation
async function generateDailyTokenId(counterId) {
    // Validate inputs to prevent null values in upsert
    if (!counterId) {
        throw new Error('Counter ID is required to generate daily token ID');
    }

    const today = new Date().toISOString().split('T')[0];

    if (!today) {
        throw new Error('Unable to generate current date for daily token ID');
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

    console.log('🔍 Searching DailyCounter for:', { counterId, date: today });

    // Changed to use findOneAndUpdate with upsert (atomic operation)
    const dailyCounter = await DailyCounter.findOneAndUpdate(
        {
            counterId: counterId,
            date: today
        },
        {
            $inc: { lastTokenNumber: 1 },
            $setOnInsert: {
                counterId: counterId,
                counterNumber: counterNumber,
                date: today
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true
        }
    );

    console.log('✅ Token number:', dailyCounter.lastTokenNumber);

    return dailyCounter.lastTokenNumber.toString().padStart(2, '0');
}

// ========================================
// CRITICAL: SPECIFIC ROUTES MUST COME FIRST
// ========================================

// GET /api/tokens/active
router.get('/active', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching waiting tokens for user:', req.user);

        let query = { status: 'Active' };

        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }

        if (req.user.role === 'user') {
            const user = await User.findById(req.user.id).populate('counterId').populate('cabinId');
            if (user) {
                // ✅ FIXED: Check userType to determine which ID to use
                const isCounterUser = user.userType && user.userType.includes('counter');
                const isCabinUser = user.userType && user.userType.includes('cabin');

                if (isCabinUser && user.cabinId) {
                    // For cabin users, filter by cabinId
                    query.cabinId = user.cabinId._id;
                    console.log('🏠 Filtering active tokens by user cabin:', user.cabinId.name || user.cabinId._id);
                } else if (isCounterUser && user.counterId) {
                    // For counter users, filter by counterId
                    query.counterId = user.counterId._id;
                    console.log('🏪 Filtering active tokens by user counter:', user.counterId.name || user.counterId._id);
                } else if (user.counterId) {
                    // Fallback for backward compatibility
                    query.counterId = user.counterId._id;
                    console.log('⚠️ Fallback: Filtering active tokens by user counter (no userType):', user.counterId._id);
                }
            }
        }

        const tokens = await Token.find(query)
            .populate('vendorId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        console.log(`Found ${tokens.length} active tokens`);

        res.json({
            success: true,
            message: 'Active tokens fetched successfully',
            data: tokens,
            count: tokens.length
        });

    } catch (error) {
        console.error('Error fetching waiting tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch waiting tokens',
            error: error.message
        });
    }
});

// GET /api/tokens/history
router.get('/history', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('=== GET /api/tokens/history ===');
        console.log('User:', req.user);

        const { page = 1, limit = 50, status, type, startDate, endDate } = req.query;
        console.log('Query parameters:', { page, limit, status, type, startDate, endDate });

        let query = {};

        if (req.user.role === 'vendor') {
            query.vendorId = req.user.vendorId;
            console.log('Vendor filter applied - vendorId:', req.user.vendorId);
        }

        if (req.user.role === 'user') {
            const user = await User.findById(req.user.id).populate('counterId').populate('cabinId');
            if (user) {
                // ✅ FIXED: Check userType to determine which ID to use
                const isCounterUser = user.userType && user.userType.includes('counter');
                const isCabinUser = user.userType && user.userType.includes('cabin');

                if (isCabinUser && user.cabinId) {
                    // For cabin users, filter by cabinId
                    query.cabinId = user.cabinId._id;
                    console.log('🏠 Filtering token history by user cabin:', user.cabinId.name || user.cabinId._id);
                } else if (isCounterUser && user.counterId) {
                    // For counter users, filter by counterId
                    query.counterId = user.counterId._id;
                    console.log('🏪 Filtering token history by user counter:', user.counterId.name || user.counterId._id);
                } else if (user.counterId) {
                    // Fallback for backward compatibility
                    query.counterId = user.counterId._id;
                    console.log('⚠️ Fallback: Filtering token history by user counter (no userType):', user.counterId._id);
                }
            }
        }

        if (status) {
            query.status = status;
            console.log('Status filter applied:', status);
        }
        if (type) {
            query.type = type;
            console.log('Type filter applied:', type);
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
                console.log('Start date filter applied:', startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
                console.log('End date filter applied:', endDate);
            }
        }

        console.log('Final MongoDB query:', JSON.stringify(query, null, 2));

        const skip = (parseInt(page) - 1) * parseInt(limit);
        console.log('Pagination - Page:', page, 'Limit:', limit, 'Skip:', skip);

        const dbQueryStart = Date.now();
        const [tokens, total] = await Promise.all([
            Token.find(query)
                .populate('vendorId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Token.countDocuments(query)
        ]);
        const dbQueryTime = Date.now() - dbQueryStart;

        console.log('Database query completed in', dbQueryTime, 'ms');
        console.log('Results - Found tokens:', tokens.length, 'Total matching records:', total);

        if (tokens.length > 0) {
            console.log('Sample tokens returned:', tokens.slice(0, 2).map(token => ({
                tokenId: token.tokenId,
                status: token.status,
                customerName: token.customerName,
                createdAt: token.createdAt,
                vendorName: token.vendorId?.name || 'No vendor'
            })));
        }

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        };

        console.log('Pagination info:', pagination);

        const totalTime = Date.now() - startTime;
        console.log('=== Token history request completed in', totalTime, 'ms ===');

        res.json({
            success: true,
            message: 'Token history fetched successfully',
            data: tokens,
            count: tokens.length,
            pagination,
            metadata: {
                queryTime: dbQueryTime,
                totalTime,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('=== ERROR in GET /api/tokens/history ===');
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code
        });
        console.error('Request context:', {
            user: req.user ? { id: req.user.id, role: req.user.role } : 'No user',
            query: req.query,
            params: req.params,
            method: req.method,
            url: req.originalUrl
        });
        console.error('Request failed after', totalTime, 'ms');

        res.status(500).json({
            success: false,
            message: 'Failed to fetch token history',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/tokens/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }

        const stats = {
            active: await Token.countDocuments({ ...query, status: 'Active' }),
            completed: await Token.countDocuments({ ...query, status: 'Completed' }),
            cancelled: await Token.countDocuments({ ...query, status: 'Cancelled' }),
            total: await Token.countDocuments(query)
        };

        res.json({
            success: true,
            message: 'Token statistics fetched successfully',
            data: stats
        });

    } catch (error) {
        console.error('Error fetching token stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch token statistics',
            error: error.message
        });
    }
});

// GET /api/tokens/cash-report
router.get('/cash-report', authenticateToken, async (req, res) => {
    try {
        console.log('\n=== GET /api/tokens/cash-report (using collection-stats logic) ===');
        console.log('User from JWT:', {
            id: req.user.id,
            role: req.user.role,
            counterId: req.user.counterId,
            vendorId: req.user.vendorId
        });

        let query = { status: 'Completed' };
        let queryDescription = '';

        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
            queryDescription = `vendor ${req.user.vendorId}`;
            console.log('🏪 Vendor role detected - filtering by vendorId:', req.user.vendorId);
        } else if (req.user.role === 'user') {
            const user = await User.findById(req.user.id).populate('counterId');

            if (!user) {
                console.log('❌ User not found:', req.user.id);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            console.log('✅ User found:', {
                username: user.username,
                counterId: user.counterId?._id,
                counterName: user.counterId?.name
            });

            if (!user.counterId) {
                console.log('⚠️ No counter assigned to user');
                return res.json({
                    success: true,
                    message: 'No counter assigned',
                    data: {
                        overall: {
                            totalTokens: 0,
                            totalAmount: "0.00",
                            cashCollection: "0.00",
                            upiCollection: "0.00",
                            creditCardCollection: "0.00",
                            onlineCollection: "0.00"
                        },
                        counters: [],
                        cabins: [],
                        items: [],
                        paymentMethods: {
                            cash: { amount: 0, count: 0 },
                            upi: { amount: 0, count: 0 },
                            card: { amount: 0, count: 0 }
                        },
                        transactions: []
                    }
                });
            }

            const assignedCounterId = user.counterId._id;
            const assignedCounterName = user.counterId.name;

            console.log('✅ Assigned counter:', {
                id: assignedCounterId,
                name: assignedCounterName
            });

            query.counterId = assignedCounterId;
            queryDescription = `counter ${assignedCounterName}`;
        } else {
            console.log('❌ Unknown user role:', req.user.role);
            return res.status(403).json({
                success: false,
                message: 'Invalid user role for cash report access'
            });
        }

        const { date, type, startDate: queryStartDate, endDate: queryEndDate } = req.query;
        let startDate, endDate;

        if (type === 'total') {
            console.log('📊 Total view requested - no date filter');
        } else if ((type === 'date' || type === 'range') && queryStartDate && queryEndDate) {
            startDate = new Date(queryStartDate);
            endDate = new Date(queryEndDate);

            // Adjust for IST (UTC+5:30) by subtracting 5.5 hours
            startDate = new Date(startDate.getTime() - 5.5 * 60 * 60 * 1000);
            endDate = new Date(endDate.getTime() - 5.5 * 60 * 60 * 1000);

            query.completedAt = {
                $gte: startDate,
                $lte: endDate
            };

            console.log('📅 Date range view (by completion, adjusted for IST):', {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            });
        } else {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            // Adjust for IST (UTC+5:30) by subtracting 5.5 hours
            startDate = new Date(startDate.getTime() - 5.5 * 60 * 60 * 1000);
            endDate = new Date(endDate.getTime() - 5.5 * 60 * 60 * 1000);

            query.completedAt = {
                $gte: startDate,
                $lte: endDate
            };

            console.log('📅 Default today view (by completion, adjusted for IST):', {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            });
        }

        console.log('🔍 MongoDB Query:', JSON.stringify(query, null, 2));

        const completedTokens = await Token.find(query).sort({ createdAt: -1 });

        console.log(`💰 Found ${completedTokens.length} completed tokens for ${queryDescription}`);

        if (completedTokens.length > 0) {
            console.log('Sample tokens:', completedTokens.slice(0, 3).map(t => ({
                tokenId: t.tokenId,
                counterId: t.counterId,
                counterName: t.counterName,
                amount: t.amount,
                paymentMode: t.paymentMode
            })));
        }

        let totalAmount = 0;
        let cashCollection = 0;
        let upiCollection = 0;
        let creditCardCollection = 0;
        let onlineCollection = 0;

        const cabinData = {};
        const counterData = {};
        const paymentMethods = {
            cash: { amount: 0, count: 0 },
            upi: { amount: 0, count: 0 },
            card: { amount: 0, count: 0 }
        };

        const itemData = {};

        completedTokens.forEach(token => {
            const amount = parseFloat(token.amount) || 0;
            totalAmount += amount;

            const paymentMode = token.paymentMode?.toLowerCase() || 'cash';
            if (paymentMode === 'cash') {
                cashCollection += amount;
                paymentMethods.cash.amount += amount;
                paymentMethods.cash.count += 1;
            } else if (paymentMode === 'upi') {
                upiCollection += amount;
                onlineCollection += amount;
                paymentMethods.upi.amount += amount;
                paymentMethods.upi.count += 1;
            } else if (paymentMode === 'card' || paymentMode === 'credit card') {
                creditCardCollection += amount;
                onlineCollection += amount;
                paymentMethods.card.amount += amount;
                paymentMethods.card.count += 1;
            }

            const cabinName = token.cabin || 'Unknown Cabin';
            if (!cabinData[cabinName]) {
                cabinData[cabinName] = { totalCash: 0, tokenCount: 0 };
            }
            cabinData[cabinName].totalCash += amount;
            cabinData[cabinName].tokenCount += 1;

            const counterNumber = token.counterNumber || 1;
            if (!counterData[counterNumber]) {
                counterData[counterNumber] = { totalCash: 0, tokenCount: 0 };
            }
            counterData[counterNumber].totalCash += amount;
            counterData[counterNumber].tokenCount += 1;

            const items = Array.isArray(token.item) ? token.item : [token.item];
            items.forEach(item => {
                const itemName = typeof item === 'string' ? item.split(' (x')[0] : 'Unknown Item';
                if (!itemData[itemName]) {
                    itemData[itemName] = { quantity: 0, totalAmount: 0 };
                }
                const quantityMatch = item.match(/\(x(\d+)\)/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                itemData[itemName].quantity += quantity;
                itemData[itemName].totalAmount += amount;
            });
        });

        const formattedCabins = Object.entries(cabinData).map(([cabinName, data]) => ({
            cabinName,
            totalCash: data.totalCash.toFixed(2),
            tokenCount: data.tokenCount
        }));

        const formattedCounters = Object.entries(counterData).map(([counterNumber, data]) => ({
            counterNumber: parseInt(counterNumber),
            totalCash: data.totalCash.toFixed(2),
            tokenCount: data.tokenCount
        }));

        const items = Object.entries(itemData).map(([itemName, data]) => ({
            itemName,
            quantity: data.quantity,
            totalAmount: data.totalAmount.toFixed(2)
        }));

        const overall = {
            totalTokens: completedTokens.length,
            totalAmount: totalAmount.toFixed(2),
            cashCollection: cashCollection.toFixed(2),
            upiCollection: upiCollection.toFixed(2),
            creditCardCollection: creditCardCollection.toFixed(2),
            onlineCollection: onlineCollection.toFixed(2)
        };

        const transactions = completedTokens.slice(0, 100).map(token => ({
            tokenId: token.tokenId,
            dailyTokenId: token.dailyTokenId,
            customerName: token.customerName,
            counterNumber: token.counterNumber,
            cabin: token.cabin,
            amount: token.amount,
            paymentMode: token.paymentMode,
            createdAt: token.createdAt,
            completedAt: token.completedAt
        }));

        console.log(`💵 Collections - Total: ${totalAmount}, Cash: ${cashCollection}, UPI: ${upiCollection}, Card: ${creditCardCollection}`);

        res.json({
            success: true,
            message: 'Cash report fetched successfully',
            data: {
                overall,
                counters: formattedCounters,
                cabins: formattedCabins,
                items,
                paymentMethods,
                transactions
            }
        });

    } catch (error) {
        console.error('❌ Error fetching cash report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash report',
            error: error.message
        });
    }
});

// GET /api/tokens/collection-stats
router.get('/collection-stats', authenticateToken, async (req, res) => {
    try {
        console.log('\n=== GET /api/tokens/collection-stats (using stored collection data) ===');
        console.log('User from JWT:', {
            id: req.user.id,
            role: req.user.role,
            counterId: req.user.counterId,
            vendorId: req.user.vendorId
        });

        const user = await User.findById(req.user.id).populate('counterId');

        if (!user) {
            console.log('❌ User not found:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User found:', {
            username: user.username,
            counterId: user.counterId?._id,
            counterName: user.counterId?.name,
            vendorId: user.vendorId
        });

        if (!user.counterId) {
            console.log('⚠️ No counter assigned to user');
            return res.json({
                success: true,
                message: 'No counter assigned',
                data: {
                    counterId: null,
                    counterName: 'N/A',
                    counterNumber: 'N/A',
                    totalCollection: "0.00",
                    cashCollection: "0.00",
                    onlineCollection: "0.00",
                    completedTokens: 0
                }
            });
        }

        const assignedCounterId = user.counterId._id;
        const assignedCounterName = user.counterId.name;
        const vendorId = user.vendorId;

        console.log('✅ Assigned counter:', {
            id: assignedCounterId,
            name: assignedCounterName
        });

        let collection = await Collection.findOne({ vendorId: vendorId });

        if (!collection) {
            console.log('⚠️ No collection found for vendor, returning zero stats');
            collection = {
                cashCollection: 0,
                onlineCollection: 0,
                totalCollection: 0
            };
        } else {
            console.log('💰 Found stored collection data:', {
                vendorId: vendorId,
                cashCollection: collection.cashCollection,
                onlineCollection: collection.onlineCollection,
                totalCollection: collection.totalCollection
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const completedTokensCount = await Token.countDocuments({
            counterId: assignedCounterId,
            status: 'Completed',
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        console.log(`📊 Today's completed tokens for counter ${assignedCounterName}: ${completedTokensCount}`);

        res.json({
            success: true,
            message: 'Collection statistics fetched successfully',
            data: {
                counterId: assignedCounterId,
                counterName: assignedCounterName,
                counterNumber: assignedCounterName,
                totalCollection: (collection.totalCollection || 0).toFixed(2),
                cashCollection: (collection.cashCollection || 0).toFixed(2),
                onlineCollection: (collection.onlineCollection || 0).toFixed(2),
                completedTokens: completedTokensCount
            }
        });

    } catch (error) {
        console.error('❌ Error fetching collection stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection statistics',
            error: error.message
        });
    }
});

// ========================================
// GENERIC ROUTES (AFTER SPECIFIC ROUTES)
// ========================================

// ✅ FIXED: Helper function with userType-aware assignment
const autoAssignCounterAndCabin = async (user) => {
    try {
        console.log('🔄 Auto-assigning counter and cabin for user:', user.username, 'userType:', user.userType);

        if (!user.vendorId) {
            console.log('⚠️ User has no vendorId, skipping auto-assignment');
            return user;
        }

        let needsUpdate = false;

        // ✅ CRITICAL FIX: Check userType before assigning
        const isCounterUser = user.userType && user.userType.includes('counter');
        const isCabinUser = user.userType && user.userType.includes('cabin');

        console.log('🔍 User type analysis:', { isCounterUser, isCabinUser });

        // ✅ If user is a COUNTER user
        if (isCounterUser) {
            console.log('🏪 Processing COUNTER user assignment');

            // Validate existing counter assignment
            let counterValid = false;
            if (user.counterId) {
                const existingCounter = await Counter.findOne({
                    _id: user.counterId,
                    vendorId: user.vendorId,
                    status: 'active'
                });
                if (existingCounter) {
                    counterValid = true;
                    console.log('✅ Existing counter is valid:', existingCounter.name);
                }
            }

            // Auto-assign counter if missing or invalid
            if (!counterValid) {
                const latestCounter = await Counter.findOne({
                    vendorId: user.vendorId,
                    status: 'active'
                }).sort({ createdAt: -1 });

                if (latestCounter) {
                    user.counterId = latestCounter._id;
                    user.cabinId = null; // ✅ CRITICAL: Set cabin to null for counter users
                    needsUpdate = true;
                    console.log('✅ Auto-assigned counter to counter user:', latestCounter.name);
                } else {
                    console.log('⚠️ No active counter found for vendor');
                }
            }

            // ✅ CRITICAL: Ensure cabin is null for counter users
            if (user.cabinId) {
                user.cabinId = null;
                needsUpdate = true;
                console.log('🧹 Cleared cabin assignment for counter user');
            }
        }

        // ✅ If user is a CABIN user
        else if (isCabinUser) {
            console.log('🏠 Processing CABIN user assignment');

            // Validate existing cabin assignment
            let cabinValid = false;
            if (user.cabinId) {
                const existingCabin = await Cabin.findOne({
                    _id: user.cabinId,
                    vendorId: user.vendorId,
                    isActive: true
                });
                if (existingCabin) {
                    cabinValid = true;
                    console.log('✅ Existing cabin is valid:', existingCabin.name);
                }
            }

            // Auto-assign cabin if missing or invalid
            if (!cabinValid) {
                const latestCabin = await Cabin.findOne({
                    vendorId: user.vendorId,
                    isActive: true
                }).sort({ createdAt: -1 });

                if (latestCabin) {
                    user.cabinId = latestCabin._id;
                    user.counterId = null; // ✅ CRITICAL: Set counter to null for cabin users
                    needsUpdate = true;
                    console.log('✅ Auto-assigned cabin to cabin user:', latestCabin.name);
                } else {
                    console.log('⚠️ No active cabin found for vendor');
                }
            }

            // ✅ CRITICAL: Ensure counter is null for cabin users
            if (user.counterId) {
                user.counterId = null;
                needsUpdate = true;
                console.log('🧹 Cleared counter assignment for cabin user');
            }
        }

        // ✅ If userType is not set or empty, default to counter behavior (backward compatibility)
        else {
            console.log('⚠️ User has no userType set, defaulting to counter behavior');
            // Keep existing logic for backward compatibility
            let counterValid = false;
            if (user.counterId) {
                const existingCounter = await Counter.findOne({
                    _id: user.counterId,
                    vendorId: user.vendorId,
                    status: 'active'
                });
                if (existingCounter) {
                    counterValid = true;
                }
            }

            if (!counterValid) {
                const latestCounter = await Counter.findOne({
                    vendorId: user.vendorId,
                    status: 'active'
                }).sort({ createdAt: -1 });

                if (latestCounter) {
                    user.counterId = latestCounter._id;
                    user.cabinId = null;
                    needsUpdate = true;
                    console.log('✅ Auto-assigned counter (default behavior):', latestCounter.name);
                }
            }
        }

        // Save user if assignments were made
        if (needsUpdate) {
            await user.save();
            console.log('💾 User assignments saved');
        } else {
            console.log('ℹ️ User already has valid assignments');
        }

        return user;
    } catch (error) {
        console.error('❌ Error in auto-assignment:', error);
        return user; // Return user as-is if assignment fails
    }
};

// POST /api/tokens - Create token
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            customerName,
            mobileNo,
            counterNumber,
            item,
            paymentMode,
            cabin,
            estimatedWaitTime,
            amount
        } = req.body;

        console.log('📥 Received request body:', req.body);

        if (!customerName || !mobileNo || !item || !paymentMode || !cabin) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: customerName, mobileNo, item, paymentMode, cabin'
            });
        }

        const cleanMobile = mobileNo.toString().replace(/\D/g, '');
        if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number. Must be 10 digits starting with 6-9'
            });
        }

        let user = await User.findById(req.user.id);
        user = await autoAssignCounterAndCabin(user);

        await user.populate('counterId');
        await user.populate('cabinId');

        let assignedCounter = user.counterId;

        // For cabin users, assign a counter if not already assigned
        if (!assignedCounter && user.cabinId) {
            const counter = await Counter.findOne({
                vendorId: user.vendorId,
                status: 'active'
            }).sort({ createdAt: -1 });

            if (counter) {
                assignedCounter = counter;
                console.log('✅ Assigned counter for cabin user:', counter.name);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'No active counter found for your vendor. Please contact administrator.'
                });
            }
        }

        if (!assignedCounter) {
            return res.status(400).json({
                success: false,
                message: 'No active counter assigned to your account. Please contact administrator.'
            });
        }

        console.log('✅ Assigned counter:', {
            id: assignedCounter._id,
            name: assignedCounter.name
        });

        let extractedCounterNumber = 1;
        const counterName = assignedCounter.name || '';
        const match = counterName.match(/(\d+)/);
        if (match) {
            extractedCounterNumber = parseInt(match[1]);
        }

        console.log('✅ Extracted counter number:', extractedCounterNumber);

        let tokenVendorId = user.vendorId;

        // ✅ FIX: Find cabin by name to get cabinId for proper filtering (case-insensitive)
        let cabinId = null;
        let cabinNumber = null;
        if (cabin) {
            const cabinDoc = await Cabin.findOne({
                name: { $regex: new RegExp('^' + cabin.trim() + '$', 'i') },
                vendorId: tokenVendorId,
                isActive: true
            });
            if (cabinDoc) {
                cabinId = cabinDoc._id;
                cabinNumber = cabinDoc.cabinNumber;
                console.log('✅ Found cabin for token:', {
                    name: cabinDoc.name,
                    id: cabinDoc._id,
                    cabinNumber: cabinDoc.cabinNumber
                });
            } else {
                console.log('⚠️ Cabin not found:', cabin, 'for vendor:', tokenVendorId);
            }
        }

        const tokenId = generateTokenId();
        const dailyTokenId = await generateDailyTokenId(assignedCounter._id);

        console.log('📝 Creating token with daily ID:', dailyTokenId);

        const tokenData = {
            tokenId: tokenId,
            dailyTokenId: dailyTokenId,
            customerName: customerName.trim(),
            mobileNo: cleanMobile,
            counterNumber: extractedCounterNumber,
            counterId: assignedCounter._id,
            counterName: assignedCounter.name,
            item: Array.isArray(item) ? item : [item],
            paymentMode: paymentMode,
            amount: parseFloat(amount) || 0,
            cabin: cabin,
            cabinId: cabinId, // ✅ FIX: Add cabinId for proper cabin user filtering
            cabinNumber: cabinNumber, // ✅ FIX: Add cabinNumber for consistency
            vendorId: tokenVendorId,
            createdBy: req.user.id,
            status: 'Active'
        };

        console.log('💾 Token data before save:', {
            tokenId: tokenData.tokenId,
            counterId: tokenData.counterId,
            counterNumber: tokenData.counterNumber,
            counterName: tokenData.counterName,
            cabin: tokenData.cabin,
            status: tokenData.status,
            amount: tokenData.amount
        });

        const token = new Token(tokenData);
        const savedToken = await token.save();
        await savedToken.populate('vendorId', 'name');

        console.log('✅ Token created successfully:', savedToken.tokenId);
        console.log('💰 Payment processed:', paymentMode, '- ₹' + amount);

        // ✅ FIXED: UPDATE COLLECTIONS with proper payment mode matching
        try {
            const collectionAmount = parseFloat(amount) || 0;

            console.log('🔍 Processing collection update:', {
                vendorId: tokenVendorId,
                paymentMode: paymentMode,
                amount: collectionAmount
            });

            // Find or create collection document
            let collection = await Collection.findOne({ vendorId: tokenVendorId });

            if (!collection) {
                console.log('📝 Creating new collection document for vendor:', tokenVendorId);
                collection = new Collection({
                    vendorId: tokenVendorId,
                    cashCollection: 0,
                    onlineCollection: 0,
                    totalCollection: 0
                });
            }

            // ✅ CRITICAL FIX: Normalize payment mode to lowercase for comparison
            const normalizedPaymentMode = (paymentMode || 'cash').toLowerCase().trim();

            console.log('🔄 Normalized payment mode:', normalizedPaymentMode);

            // Update collections based on payment mode
            if (normalizedPaymentMode === 'cash') {
                collection.cashCollection += collectionAmount;
                console.log('💵 Adding to cash collection:', collectionAmount);
            } else if (['card', 'upi', 'online', 'credit card', 'debit card'].includes(normalizedPaymentMode)) {
                collection.onlineCollection += collectionAmount;
                console.log('💳 Adding to online collection:', collectionAmount);
            } else {
                console.warn('⚠️ Unknown payment mode, defaulting to cash:', normalizedPaymentMode);
                collection.cashCollection += collectionAmount;
            }

            // Update total collection
            collection.totalCollection = collection.cashCollection + collection.onlineCollection;

            // Save to database
            const savedCollection = await collection.save();

            console.log('✅ Collection updated successfully:', {
                vendorId: tokenVendorId,
                cashCollection: savedCollection.cashCollection,
                onlineCollection: savedCollection.onlineCollection,
                totalCollection: savedCollection.totalCollection,
                _id: savedCollection._id
            });

            // ✅ VERIFICATION: Immediately read back from database
            const verifyCollection = await Collection.findOne({ vendorId: tokenVendorId });
            console.log('🔍 Verification - Collection in DB:', {
                cashCollection: verifyCollection?.cashCollection,
                onlineCollection: verifyCollection?.onlineCollection,
                totalCollection: verifyCollection?.totalCollection
            });

        } catch (collectionError) {
            console.error('❌ Error updating collection:', collectionError);
            console.error('Collection error details:', {
                message: collectionError.message,
                stack: collectionError.stack,
                name: collectionError.name
            });
            // Don't throw error - token is already created
        }

        // Send SMS notification
        let smsResult = { success: false, error: 'SMS not attempted' };

        try {
            console.log('📤 Attempting to send SMS to:', cleanMobile);

            smsResult = await SmsService.sendSMS(cleanMobile, {
                tokenId: dailyTokenId,
                customerName: customerName,
                counterNumber: assignedCounter.name,
                estimatedWaitTime: estimatedWaitTime || 10,
                amount: parseFloat(amount) || 0
            });

            console.log('📨 SMS Result:', smsResult.success ? '✅ SUCCESS' : '❌ FAILED');

            if (smsResult.success) {
                console.log('📱 SMS sent! Message ID:', smsResult.messageId);
            } else {
                console.error('❌ SMS Error:', smsResult.error);
            }

        } catch (smsError) {
            console.error('💥 SMS Exception:', smsError.message);
            smsResult = {
                success: false,
                error: smsError.message
            };
        }

        res.status(201).json({
            success: true,
            message: 'Token created and payment completed successfully',
            token: savedToken,
            smsSent: smsResult.success,
            smsMessageId: smsResult.messageId || null,
            smsError: smsResult.error || null
        });

    } catch (error) {
        console.error('💥 Error creating token:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            errors: error.errors
        });

        res.status(500).json({
            success: false,
            message: 'Failed to create token',
            error: error.message,
            details: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })) : undefined
        });
    }
});

// PUT /api/tokens/:id - Update token status
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const tokenId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const updateData = {
            status: status,
            updatedAt: new Date()
        };

        if (status === 'Completed') {
            updateData.completedAt = getISTTime();
            updateData.completedBy = req.user.id;
        } else if (status === 'Called') {
            updateData.calledAt = new Date();
            updateData.calledBy = req.user.id;
        }

        const token = await Token.findOneAndUpdate(
            { tokenId: tokenId },
            updateData,
            { new: true }
        ).populate('vendorId', 'name');

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        console.log('Token updated:', token);

        res.json({
            success: true,
            message: `Token marked as ${status}`,
            data: token
        });

    } catch (error) {
        console.error('Error updating token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update token',
            error: error.message
        });
    }
});

// PUT /api/tokens/:id/cancel - Cancel a completed token
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const tokenId = req.params.id;

        const token = await Token.findById(tokenId);

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        if (token.status !== 'Completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed tokens can be cancelled'
            });
        }

        token.status = 'Cancelled';
        token.updatedAt = new Date();
        await token.save();
        await token.populate('vendorId', 'name');

        console.log('Token cancelled:', token);

        res.json({
            success: true,
            message: 'Token cancelled successfully',
            data: token
        });

    } catch (error) {
        console.error('Error cancelling token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel token',
            error: error.message
        });
    }
});

// PUT /api/tokens/:id/complete - Mark token as completed
router.put('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const tokenId = req.params.id;

        const token = await Token.findOneAndUpdate(
            { tokenId: tokenId },
            {
                status: 'Completed',
                completedAt: getISTTime(),
                completedBy: req.user.id
            },
            { new: true }
        ).populate('vendorId', 'name');

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        console.log('Token completed:', token);

        res.json({
            success: true,
            message: 'Token marked as completed',
            data: token
        });

    } catch (error) {
        console.error('Error completing token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete token',
            error: error.message
        });
    }
});

// PATCH /api/tokens/:id/status - Update token status (for moving back to active)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const tokenId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status
        const validStatuses = ['Active', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: Active, Completed, Cancelled'
            });
        }

        const updateData = {
            status: status,
            updatedAt: new Date()
        };

        // Clear completion fields when moving back to active
        if (status === 'Active') {
            updateData.completedAt = null;
            updateData.completedBy = null;
        } else if (status === 'Completed') {
            updateData.completedAt = getISTTime();
            updateData.completedBy = req.user.id;
        }

        const token = await Token.findByIdAndUpdate(
            tokenId,
            updateData,
            { new: true }
        ).populate('vendorId', 'name');

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        console.log('Token status updated:', { tokenId: token.tokenId, newStatus: status });

        res.json({
            success: true,
            message: `Token status updated to ${status}`,
            data: token
        });

    } catch (error) {
        console.error('Error updating token status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update token status',
            error: error.message
        });
    }
});

// GET /api/tokens/:id - Get token details (MUST BE LAST!)
router.get('/:id', async (req, res) => {
    try {
        const tokenId = req.params.id;

        const token = await Token.findOne({ tokenId: tokenId })
            .populate('vendorId', 'name');

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        res.json({
            success: true,
            message: 'Token details fetched successfully',
            data: token
        });

    } catch (error) {
        console.error('Error fetching token details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch token details',
            error: error.message
        });
    }
});

export default router;