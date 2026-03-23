import { Router } from "express";
import { User, Counter, Cabin } from "../models/model.js";
import { authenticateToken, isVendor } from "../middlewares/auth.js";

const router = Router();

// Get user's assigned cabin and counter
router.get('/assignment/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId)
            .populate('cabinId')
            .populate('counterId');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            assignment: {
                cabinId: user.cabinId?._id || null,
                cabinName: user.cabinId?.name || null,
                counterId: user.counterId?._id || null,
                counterName: user.counterId?.name || null
            }
        });
    } catch (error) {
        console.error('Error fetching user assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user assignment'
        });
    }
});

// Assign user to cabin and counter
router.post('/assignment/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cabinId, counterId } = req.body;

        // Validate that the counter belongs to the specified cabin
        if (counterId) {
            const counter = await Counter.findById(counterId).populate('cabinId');
            if (!counter) {
                return res.status(404).json({
                    success: false,
                    message: 'Counter not found'
                });
            }

            if (cabinId && counter.cabinId?._id.toString() !== cabinId) {
                return res.status(400).json({
                    success: false,
                    message: 'Counter does not belong to the specified cabin'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                cabinId: null, // Always set cabin to null when assigning counter
                counterId
            },
            { new: true }
        ).populate(['cabinId', 'counterId']);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User assignment updated successfully',
            user: {
                id: user._id,
                username: user.username,
                cabinId: user.cabinId?._id || null,
                cabinName: user.cabinId?.name || null,
                counterId: user.counterId?._id || null,
                counterName: user.counterId?.name || null
            }
        });
    } catch (error) {
        console.error('Error updating user assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user assignment'
        });
    }
});

// Verify user's access to cabin/counter
router.get('/verify-access/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cabinId, counterId } = req.query;

        const user = await User.findById(userId)
            .populate('cabinId')
            .populate('counterId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const hasAccess = (
            (!user.cabinId || user.cabinId._id.toString() === cabinId) &&
            (!user.counterId || user.counterId._id.toString() === counterId)
        );

        res.json({
            success: true,
            hasAccess,
            assignment: {
                cabinId: user.cabinId?._id || null,
                cabinName: user.cabinId?.name || null,
                counterId: user.counterId?._id || null,
                counterName: user.counterId?.name || null
            }
        });
    } catch (error) {
        console.error('Error verifying user access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify user access'
        });
    }
});

export default router;