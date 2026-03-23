import { Router } from "express";
import jwt from 'jsonwebtoken';
import { Token, User, Vendor } from "../models/model.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// GET /api/token-history/history - Get token history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/token-history/history ===');
        console.log('User:', req.user);
        console.log('Query params:', req.query);

        const {
            page = 1,
            limit = 50,
            status,
            type,
            startDate,
            endDate,
            cabin,
            date
        } = req.query;

        let query = {};

        // Get user's assigned cabin and counter
        const user = await User.findById(req.user.id)
            .populate('cabinId')
            .populate('counterId');

        // If user is assigned to a specific cabin and counter, filter by them
        if (user.role === 'user' || user.role === 'counter') {
            if (user.cabinId) {
                query.cabin = user.cabinId.name;
            }
            if (user.counterId) {
                query.counterNumber = user.counterId.counterNumber;
            }
            console.log('Filtering by user cabin and counter:', {
                cabin: query.cabin,
                counter: query.counterNumber
            });
        }

        // Vendor filter
        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
            console.log('Filtering by vendorId:', req.user.vendorId);
        }

        if (status) {
            query.status = status;
            console.log('Filtering by status:', status);
        }
        if (type) {
            query.type = type;
            console.log('Filtering by type:', type);
        }

        if (cabin && cabin !== 'all') {
            query.cabin = cabin;
            console.log('Filtering by cabin:', cabin);
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
            console.log('Filtering by specific date:', date);
        } else if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
            console.log('Date filter:', { startDate, endDate });
        }

        console.log('Final query:', JSON.stringify(query, null, 2));

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [tokens, total] = await Promise.all([
            Token.find(query)
                .populate('vendorId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Token.countDocuments(query)
        ]);

        console.log('✅ Token history query successful:');
        console.log('- Found tokens:', tokens.length);
        console.log('- Total tokens:', total);

        res.json({
            success: true,
            tokens,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Error fetching token history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch token history',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/token-history/collection-stats - Get collection statistics for user's counter
router.get('/collection-stats', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/token-history/collection-stats ===');
        console.log('User:', req.user);

        // Get user with populated counter
        const user = await User.findById(req.user.id)
            .populate('counterId')
            .populate('cabinId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User details:', {
            id: user._id,
            username: user.username,
            counterId: user.counterId,
            cabinId: user.cabinId
        });

        // If no counter assigned
        if (!user.counterId) {
            console.log('⚠️ User has no counter assigned');
            return res.json({
                success: true,
                message: 'No counter assigned to user',
                data: {
                    counterNumber: null,
                    totalCollection: '0.00',
                    cashCollection: '0.00',
                    onlineCollection: '0.00',
                    completedTokens: 0
                }
            });
        }

        const counterNumber = user.counterId.counterNumber || user.counterId.name;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('Fetching stats for counter:', counterNumber);
        console.log('Date range:', { from: today, to: tomorrow });

        // Build query
        const query = {
            counterNumber: counterNumber,
            status: 'Completed',
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        };

        console.log('Query:', JSON.stringify(query, null, 2));

        // Get completed tokens for today
        const completedTokens = await Token.find(query);

        console.log('Found completed tokens:', completedTokens.length);

        // Calculate collections
        let totalCollection = 0;
        let cashCollection = 0;
        let onlineCollection = 0;

        completedTokens.forEach(token => {
            const amount = parseFloat(token.amount) || 0;
            totalCollection += amount;

            if (token.paymentMode === 'cash') {
                cashCollection += amount;
            } else if (['card', 'upi', 'online'].includes(token.paymentMode)) {
                onlineCollection += amount;
            }
        });

        const stats = {
            counterNumber: counterNumber,
            totalCollection: totalCollection.toFixed(2),
            cashCollection: cashCollection.toFixed(2),
            onlineCollection: onlineCollection.toFixed(2),
            completedTokens: completedTokens.length
        };

        console.log('✅ Collection stats:', stats);

        res.json({
            success: true,
            message: 'Collection statistics fetched successfully',
            data: stats
        });

    } catch (error) {
        console.error('❌ Error fetching collection stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/token-history/distribution - Get token distribution
router.get('/distribution', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/token-history/distribution ===');
        const { date } = req.query;

        let query = {};

        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        query.createdAt = { $gte: startOfDay, $lte: endOfDay };

        const tokens = await Token.find(query).sort({ dailyTokenId: 1 });

        const distribution = {
            counter1: { 'Cabin-1': [], 'Cabin-2': [], 'Cabin-3': [] },
            counter2: { 'Cabin-1': [], 'Cabin-2': [], 'Cabin-3': [] },
            counter3: { 'Cabin-1': [], 'Cabin-2': [], 'Cabin-3': [] }
        };

        tokens.forEach(token => {
            const cabin = token.cabin || 'Cabin-1';
            const tokenNum = parseInt(token.dailyTokenId) || token.tokenId;
            const counter = token.counterNumber || token.counterName || '1';

            const counterKey = counter.toString().toLowerCase().includes('1') ? 'counter1' :
                counter.toString().toLowerCase().includes('2') ? 'counter2' :
                    counter.toString().toLowerCase().includes('3') ? 'counter3' :
                        'counter1';

            if (distribution[counterKey] && distribution[counterKey][cabin]) {
                distribution[counterKey][cabin].push(tokenNum);
            }
        });

        Object.keys(distribution).forEach(counter => {
            Object.keys(distribution[counter]).forEach(cabin => {
                distribution[counter][cabin].sort((a, b) => a - b);
            });
        });

        const summary = {
            'Cabin-1': 0,
            'Cabin-2': 0,
            'Cabin-3': 0
        };

        Object.keys(distribution).forEach(counter => {
            Object.keys(distribution[counter]).forEach(cabin => {
                summary[cabin] += distribution[counter][cabin].length;
            });
        });

        res.json({
            success: true,
            date: targetDate.toISOString().split('T')[0],
            data: distribution,
            summary
        });

    } catch (error) {
        console.error('❌ Error fetching distribution:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch token distribution',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/token-history/cabin-summary - Get cabin-wise summary
router.get('/cabin-summary', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/token-history/cabin-summary ===');
        const { startDate, endDate } = req.query;
        let query = {};

        if (req.user.role === 'vendor' && req.user.vendorId) {
            query.vendorId = req.user.vendorId;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const summary = await Token.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$cabin',
                    totalTokens: { $sum: 1 },
                    activeTokens: {
                        $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                    },
                    completedTokens: {
                        $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
                    },
                    cancelledTokens: {
                        $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                    },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('✅ Cabin summary:', summary);

        res.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error('❌ Error fetching cabin summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cabin summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

export default router;