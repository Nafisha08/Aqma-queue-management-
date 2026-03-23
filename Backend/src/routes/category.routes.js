import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../models/category.model.js";

const router = Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// Authentication middleware
const isSuperAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        if (user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access denied. Superadmin privileges required.' });
        }

        req.user = user;
        next();
    });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ===== CATEGORY ROUTES =====

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/categories ===');
        console.log('User:', req.user);

        let query = {};

        // Add filters if provided
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        const categories = await Category.find(query)
            .sort({ displayOrder: 1, name: 1 });

        console.log('Found categories:', categories.length);

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

// Get category by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/categories/:id ===');
        console.log('Category ID:', req.params.id);
        console.log('User:', req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        console.log('Category found:', category);

        res.json({
            success: true,
            category
        });

    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        });
    }
});

// Create new category
router.post('/', isSuperAdmin, async (req, res) => {
    try {
        console.log('=== POST /api/categories ===');
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { name, description, isActive, displayOrder, color } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Check if category with this name already exists
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Create category data
        const categoryData = {
            name: name.trim(),
            description: description ? description.trim() : '',
            isActive: isActive !== undefined ? isActive : true,
            displayOrder: displayOrder ? parseInt(displayOrder) : 0,
            color: color ? color.trim() : '#007bff'
        };

        console.log('Creating category with data:', categoryData);

        const category = new Category(categoryData);
        const savedCategory = await category.save();

        console.log('Category created successfully:', savedCategory);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: savedCategory
        });

    } catch (error) {
        console.error('Error creating category:', error);

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update category
router.put('/:id', isSuperAdmin, async (req, res) => {
    try {
        console.log('=== PUT /api/categories/:id ===');
        console.log('Category ID:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User:', req.user);

        const { id } = req.params;
        const { name, description, isActive, displayOrder, color } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        // Check if category exists
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if name is being changed and if it conflicts
        if (name && name.trim() !== existingCategory.name) {
            const nameConflict = await Category.findOne({ name: name.trim() });
            if (nameConflict) {
                return res.status(400).json({
                    success: false,
                    message: 'Another category with this name already exists'
                });
            }
        }

        // Prepare update data
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description ? description.trim() : '';
        if (isActive !== undefined) updateData.isActive = isActive;
        if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);
        if (color) updateData.color = color.trim();

        console.log('Updating category with data:', updateData);

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        console.log('Category updated successfully:', updatedCategory);

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });

    } catch (error) {
        console.error('Error updating category:', error);

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Delete category
router.delete('/:id', isSuperAdmin, async (req, res) => {
    try {
        console.log('=== DELETE /api/categories/:id ===');
        console.log('Category ID:', req.params.id);
        console.log('User:', req.user);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category is being used by any vendors
        const Vendor = require('../models/vendor.model.js').Vendor;
        const vendorCount = await Vendor.countDocuments({ categoryId: category.id });

        if (vendorCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It is being used by ${vendorCount} vendor(s).`
            });
        }

        await Category.findByIdAndDelete(id);

        console.log('Category deleted successfully:', category);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
});

// Toggle category status
router.put('/:id/toggle-status', isSuperAdmin, async (req, res) => {
    try {
        console.log('=== PUT /api/categories/:id/toggle-status ===');
        console.log('Category ID:', req.params.id);

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Toggle the status
        category.isActive = !category.isActive;
        await category.save();

        console.log('Category status toggled successfully:', category);

        res.json({
            success: true,
            message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
            category
        });

    } catch (error) {
        console.error('Error toggling category status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle category status',
            error: error.message
        });
    }
});

// Get category statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        console.log('=== GET /api/categories/stats/overview ===');
        console.log('User:', req.user);

        const stats = await Category.aggregate([
            {
                $group: {
                    _id: null,
                    totalCategories: { $sum: 1 },
                    activeCategories: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    },
                    inactiveCategories: {
                        $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
                    }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : {
            totalCategories: 0,
            activeCategories: 0,
            inactiveCategories: 0
        };

        // Remove the _id field
        delete result._id;

        console.log('Category stats:', result);

        res.json({
            success: true,
            stats: result
        });
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category statistics',
            error: error.message
        });
    }
});

export default router;
