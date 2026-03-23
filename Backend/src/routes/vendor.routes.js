import { authenticateToken } from '../middlewares/auth.js';
import { Router } from "express";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import { Item } from '../models/item.js';
// Import models
import {
    Vendor,
    SubscriptionPlan,
    User,
    VendorSubscription
} from "../models/model.js";
// Import controller
import { getVendorProfile } from '../controllers/vendor.controller.js';

const router = Router();

// GET /api/vendor/:vendorId/items - Get items for a vendor (with authorization)
router.get('/vendor/:vendorId/items', authenticateToken, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const user = req.user;

        if (!vendorId) {
            return res.status(400).json({ success: false, message: 'Vendor ID is required' });
        }

        // Authorization check: users can only access items for their own vendor
        // Superadmin and admin can access any vendor's items
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            if (!user.vendorId || user.vendorId.toString() !== vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only access items for your own vendor.'
                });
            }
        }

        const items = await Item.find({ vendorId, status: 'active' });
        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching vendor items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vendor items' });
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// ============ CATEGORY MAPPING ============
const CATEGORIES = {
    1: 'Medical',
    2: 'Shop',
    3: 'Juice Corner',
    4: 'Hospital',
    5: 'Restaurant',
    6: 'Pharmacy'
};

// ============ HELPER FUNCTIONS ============
// Helper function to create vendor subscription entry
const createVendorSubscription = async (vendorId, subscriptionId, createdBy = null) => {
    try {
        // Get subscription plan details
        const plan = await SubscriptionPlan.findOne({
            subscriptionId: subscriptionId,
            isActive: true
        });

        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        // Check if vendor already has an active subscription
        const existingSubscription = await VendorSubscription.findOne({
            vendorId: vendorId,
            status: 'active'
        });

        if (existingSubscription) {
            // Update existing subscription
            existingSubscription.planId = plan._id;
            existingSubscription.planName = plan.name;
            existingSubscription.price = plan.price;
            existingSubscription.currency = plan.currency || 'INR';
            existingSubscription.status = 'active';
            existingSubscription.paymentStatus = 'paid';
            existingSubscription.renewalDate = new Date(Date.now() + (plan.duration * 24 * 60 * 60 * 1000));
            existingSubscription.updatedAt = new Date();

            await existingSubscription.save();
            return existingSubscription;
        } else {
            // Create new subscription
            const subscription = new VendorSubscription({
                vendorId: vendorId,
                vendorName: '',
                planId: plan._id,
                planName: plan.name,
                price: plan.price,
                currency: plan.currency || 'INR',
                status: 'active',
                paymentStatus: 'paid',
                autoRenew: false,
                renewalDate: new Date(Date.now() + (plan.duration * 24 * 60 * 60 * 1000)),
                createdBy: createdBy
            });

            await subscription.save();
            return subscription;
        }
    } catch (error) {
        console.error('Error creating/updating vendor subscription:', error);
        throw error;
    }
};

// ============ Auth Middleware ============
const isSuperAdmin = (req, res, next) => {
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

        if (user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Superadmin privileges required.'
            });
        }

        req.user = user;
        next();
    });
};

// ============ Vendor Auth Middleware ============
const isVendor = (req, res, next) => {
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

        if (user.role !== 'vendor') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor privileges required.'
            });
        }

        if (!user.vendorId) {
            return res.status(403).json({
                success: false,
                message: 'Vendor ID not found in token.'
            });
        }

        req.user = user;
        next();
    });
};

// ============ GET ALL VENDORS - WITH SUBSCRIPTION NAMES ============
router.get('/vendors', isSuperAdmin, async (req, res) => {
    try {
        const { limit = 100, fields, id } = req.query;

        // Build query
        let query = { deletedAt: null };
        if (id) {
            query.vendorId = parseInt(id);
        }

        // Determine fields to select
        let selectFields = 'vendorId companyName contactPerson email phone alternateMobile gstNo address categoryId subscriptionId status createdAt';
        let requestedFields = [];

        if (fields) {
            requestedFields = fields.split(',').map(field => field.trim());
            const essentialFields = ['_id', 'vendorId', 'categoryId', 'subscriptionId', 'status', 'createdAt'];
            const allFieldsToSelect = [...new Set([...requestedFields, ...essentialFields])];

            const fieldMapping = {
                'id': 'vendorId',
                'category': 'categoryId',
                'subscription': 'subscriptionId'
            };

            selectFields = allFieldsToSelect.map(field => fieldMapping[field] || field).join(' ');
        }

        // Fetch vendors
        const vendors = await Vendor.find(query)
            .select(selectFields)
            .sort({ vendorId: 1 })
            .limit(parseInt(limit))
            .lean();

        // Only fetch subscriptions if needed
        let subscriptionsMap = {};
        if (!fields || requestedFields.includes('subscription') || requestedFields.length === 0) {
            const allSubscriptions = await SubscriptionPlan.find({ isActive: true })
                .select('subscriptionId name')
                .lean();

            subscriptionsMap = allSubscriptions.reduce((map, sub) => {
                map[sub.subscriptionId] = sub.name;
                return map;
            }, {});
        }

        // Format response based on requested fields
        const formattedVendors = vendors.map((vendor) => {
            const baseVendor = {
                _id: vendor._id.toString(),
                id: vendor.vendorId,
                vendorId: vendor.vendorId
            };

            if (!fields || requestedFields.length === 0) {
                const subscriptionName = vendor.subscriptionId && subscriptionsMap[vendor.subscriptionId]
                    ? subscriptionsMap[vendor.subscriptionId]
                    : '';

                return {
                    ...baseVendor,
                    companyName: vendor.companyName || '',
                    contactPerson: vendor.contactPerson || '',
                    email: vendor.email || '',
                    phone: vendor.phone || '',
                    alternateMobile: vendor.alternateMobile || '',
                    gstNo: vendor.gstNo || '',
                    address: vendor.address || '',
                    categoryId: vendor.categoryId,
                    category: CATEGORIES[vendor.categoryId] || 'Unknown',
                    subscriptionId: vendor.subscriptionId,
                    subscription: subscriptionName,
                    status: vendor.status || 'active',
                    isActive: true,
                    createdAt: vendor.createdAt
                };
            } else {
                const result = { ...baseVendor };

                requestedFields.forEach(field => {
                    switch (field) {
                        case 'companyName':
                            result.companyName = vendor.companyName || '';
                            break;
                        case 'contactPerson':
                            result.contactPerson = vendor.contactPerson || '';
                            break;
                        case 'email':
                            result.email = vendor.email || '';
                            break;
                        case 'phone':
                            result.phone = vendor.phone || '';
                            break;
                        case 'alternateMobile':
                            result.alternateMobile = vendor.alternateMobile || '';
                            break;
                        case 'gstNo':
                            result.gstNo = vendor.gstNo || '';
                            break;
                        case 'address':
                            result.address = vendor.address || '';
                            break;
                        case 'categoryId':
                            result.categoryId = vendor.categoryId;
                            break;
                        case 'category':
                            result.category = CATEGORIES[vendor.categoryId] || 'Unknown';
                            break;
                        case 'subscriptionId':
                            result.subscriptionId = vendor.subscriptionId;
                            break;
                        case 'subscription':
                            const subscriptionName = vendor.subscriptionId && subscriptionsMap[vendor.subscriptionId]
                                ? subscriptionsMap[vendor.subscriptionId]
                                : '';
                            result.subscription = subscriptionName;
                            break;
                        case 'status':
                            result.status = vendor.status || 'active';
                            break;
                        case 'isActive':
                            result.isActive = true;
                            break;
                        case 'createdAt':
                            result.createdAt = vendor.createdAt;
                            break;
                    }
                });

                return result;
            }
        });

        res.json({
            success: true,
            count: formattedVendors.length,
            vendors: formattedVendors
        });

    } catch (error) {
        console.error('❌ Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendors',
            error: error.message
        });
    }
});

// ============ CREATE VENDOR ============
router.post('/vendors', isSuperAdmin, async (req, res) => {
    try {
        const {
            companyName,
            contactPerson,
            email,
            phone,
            alternateMobile,
            address,
            gstNo,
            categoryId,
            subscriptionId
        } = req.body;

        // Validation
        if (!companyName || !contactPerson || !email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                errors: ['Company name, contact person, and email are required']
            });
        }

        // ✅ Check if email already exists
        const existingVendorByEmail = await Vendor.findOne({
            email: email.toLowerCase().trim(),
            deletedAt: null
        });

        if (existingVendorByEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
                errors: [`A vendor with email "${email}" already exists. Please use a different email.`],
                field: 'email'
            });
        }

        // ✅ Check if phone already exists (if phone is provided)
        if (phone && phone.trim()) {
            const existingVendorByPhone = await Vendor.findOne({
                phone: phone.trim(),
                deletedAt: null
            });

            if (existingVendorByPhone) {
                return res.status(409).json({
                    success: false,
                    message: 'Phone number already exists',
                    errors: [`A vendor with phone number "${phone}" already exists. Please use a different phone number.`],
                    field: 'phone'
                });
            }

            // ✅ Check if phone is already used as username in User collection
            const existingUser = await User.findOne({ username: phone.trim() });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Phone number already registered',
                    errors: [`Phone number "${phone}" is already registered as a user. Please use a different phone number.`],
                    field: 'phone'
                });
            }
        }

        // Prepare vendor data
        const vendorData = {
            companyName: companyName.trim(),
            contactPerson: contactPerson.trim(),
            email: email.toLowerCase().trim(),
            status: 'active',
            active: true
        };

        if (phone && phone.trim()) vendorData.phone = phone.trim();
        if (alternateMobile && alternateMobile.trim()) vendorData.alternateMobile = alternateMobile.trim();
        if (address && address.trim()) vendorData.address = address.trim();
        if (gstNo && gstNo.trim()) vendorData.gstNo = gstNo.toUpperCase().trim();
        if (categoryId) vendorData.categoryId = parseInt(categoryId);

        // Handle subscription
        if (subscriptionId && !isNaN(parseInt(subscriptionId))) {
            vendorData.subscriptionId = parseInt(subscriptionId);
        }

        // Save vendor
        const vendor = new Vendor(vendorData);
        const savedVendor = await vendor.save();

        console.log(`✅ Generated vendorId: ${savedVendor.vendorId} for ${savedVendor.companyName}`);

        // Create subscription entry if subscriptionId is provided
        if (savedVendor.subscriptionId) {
            try {
                const planExists = await SubscriptionPlan.findOne({
                    subscriptionId: savedVendor.subscriptionId,
                    isActive: true
                });

                if (planExists) {
                    const subscription = await createVendorSubscription(
                        savedVendor._id,
                        savedVendor.subscriptionId,
                        req.user.id
                    );
                    console.log('✅ Vendor subscription created:', subscription._id);
                } else {
                    console.warn('⚠️ Subscription plan not found, skipping subscription creation');
                }
            } catch (subscriptionError) {
                console.error('❌ Error creating vendor subscription:', subscriptionError);
            }
        }

        // Create user account for the vendor
        if (savedVendor.phone) {
            try {
                const vendorUser = new User({
                    username: savedVendor.phone,
                    password: '12345',
                    role: 'vendor',
                    vendorId: savedVendor._id,
                    email: savedVendor.email,
                    phone: savedVendor.phone
                });
                await vendorUser.save();
                console.log('✅ User account created for vendor');
            } catch (userError) {
                console.error('❌ Error creating user account:', userError);
            }
        }

        // Get subscription name if available
        let subscriptionName = '';
        if (savedVendor.subscriptionId) {
            try {
                const sub = await SubscriptionPlan.findOne({
                    subscriptionId: savedVendor.subscriptionId,
                    isActive: true
                }).select('name');

                if (sub) {
                    subscriptionName = sub.name;
                }
            } catch (error) {
                console.error('❌ Error fetching subscription:', error);
            }
        }

        // Return formatted response
        const response = {
            _id: savedVendor._id.toString(),
            id: savedVendor.vendorId,
            vendorId: savedVendor.vendorId,
            companyName: savedVendor.companyName,
            contactPerson: savedVendor.contactPerson,
            email: savedVendor.email,
            phone: savedVendor.phone || '',
            alternateMobile: savedVendor.alternateMobile || '',
            gstNo: savedVendor.gstNo || '',
            address: savedVendor.address || '',
            categoryId: savedVendor.categoryId,
            category: CATEGORIES[savedVendor.categoryId] || 'Unknown',
            subscriptionId: savedVendor.subscriptionId,
            subscription: subscriptionName,
            status: savedVendor.status,
            isActive: true,
            createdAt: savedVendor.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Vendor created successfully',
            vendor: response
        });

    } catch (error) {
        console.error('❌ Error creating vendor:', error);

        // ✅ Handle MongoDB duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const value = error.keyValue[field];

            let message = '';
            if (field === 'email') {
                message = `Email "${value}" is already registered. Please use a different email.`;
            } else if (field === 'phone') {
                message = `Phone number "${value}" is already registered. Please use a different phone number.`;
            } else {
                message = `${field} "${value}" already exists. Please use a different value.`;
            }

            return res.status(409).json({
                success: false,
                message: 'Duplicate entry',
                errors: [message],
                field: field
            });
        }

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
            message: 'Failed to create vendor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// ============ GET VENDOR BY ID ============
router.get('/vendors/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        let vendor;
        if (mongoose.Types.ObjectId.isValid(id)) {
            vendor = await Vendor.findById(id)
                .select('vendorId companyName contactPerson email phone alternateMobile gstNo address categoryId subscriptionId status createdAt')
                .lean();
        } else {
            vendor = await Vendor.findOne({ vendorId: parseInt(id) })
                .select('vendorId companyName contactPerson email phone alternateMobile gstNo address categoryId subscriptionId status createdAt')
                .lean();
        }

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        // Get subscription name
        let subscriptionName = '';
        if (vendor.subscriptionId) {
            try {
                const sub = await SubscriptionPlan.findOne({
                    subscriptionId: vendor.subscriptionId,
                    isActive: true
                }).select('name');

                if (sub) {
                    subscriptionName = sub.name;
                }
            } catch (error) {
                console.error('Error fetching subscription:', error);
            }
        }

        // Format response
        const response = {
            _id: vendor._id.toString(),
            id: vendor.vendorId,
            vendorId: vendor.vendorId,
            companyName: vendor.companyName,
            contactPerson: vendor.contactPerson,
            email: vendor.email,
            phone: vendor.phone || '',
            alternateMobile: vendor.alternateMobile || '',
            gstNo: vendor.gstNo || '',
            address: vendor.address || '',
            categoryId: vendor.categoryId,
            category: CATEGORIES[vendor.categoryId] || 'Unknown',
            subscriptionId: vendor.subscriptionId,
            subscription: subscriptionName,
            status: vendor.status,
            isActive: true,
            createdAt: vendor.createdAt
        };

        res.json({
            success: true,
            vendor: response
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor',
            error: error.message
        });
    }
});

// ============ UPDATE VENDOR ============
router.put('/vendors/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        let vendor;
        if (mongoose.Types.ObjectId.isValid(id)) {
            vendor = await Vendor.findById(id);
        } else {
            vendor = await Vendor.findOne({ vendorId: parseInt(id) });
        }

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        // ✅ Check if email is being changed and if it's already taken
        if (req.body.email && req.body.email.toLowerCase().trim() !== vendor.email) {
            const existingVendorByEmail = await Vendor.findOne({
                email: req.body.email.toLowerCase().trim(),
                _id: { $ne: vendor._id },
                deletedAt: null
            });

            if (existingVendorByEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already exists',
                    errors: [`Email "${req.body.email}" is already registered to another vendor.`],
                    field: 'email'
                });
            }
        }

        // ✅ Check if phone is being changed and if it's already taken
        if (req.body.phone && req.body.phone.trim() !== vendor.phone) {
            const existingVendorByPhone = await Vendor.findOne({
                phone: req.body.phone.trim(),
                _id: { $ne: vendor._id },
                deletedAt: null
            });

            if (existingVendorByPhone) {
                return res.status(409).json({
                    success: false,
                    message: 'Phone number already exists',
                    errors: [`Phone number "${req.body.phone}" is already registered to another vendor.`],
                    field: 'phone'
                });
            }

            // Check if phone is used as username by another user
            const existingUser = await User.findOne({
                username: req.body.phone.trim(),
                vendorId: { $ne: vendor._id }
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Phone number already registered',
                    errors: [`Phone number "${req.body.phone}" is already registered to another user.`],
                    field: 'phone'
                });
            }
        }

        // Check if phone is being updated
        const oldPhone = vendor.phone;
        const newPhone = req.body.phone ? req.body.phone.trim() : null;

        // Prepare update data
        const updateData = {};
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined && req.body[key] !== null && req.body[key] !== '') {
                if (key === 'email') {
                    updateData[key] = req.body[key].toLowerCase().trim();
                } else if (key === 'gstNo') {
                    updateData[key] = req.body[key].toUpperCase().trim();
                } else if (key === 'subscriptionId' && !isNaN(parseInt(req.body[key]))) {
                    updateData.subscriptionId = parseInt(req.body[key]);
                } else if (key === 'categoryId' && !isNaN(parseInt(req.body[key]))) {
                    updateData.categoryId = parseInt(req.body[key]);
                } else if (typeof req.body[key] === 'string') {
                    updateData[key] = req.body[key].trim();
                } else {
                    updateData[key] = req.body[key];
                }
            }
        });

        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendor._id,
            updateData,
            { new: true, runValidators: true }
        ).select('vendorId companyName contactPerson email phone alternateMobile gstNo address categoryId subscriptionId status createdAt');

        if (!updatedVendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found after update'
            });
        }

        // Handle subscription changes
        if (updateData.subscriptionId !== undefined) {
            try {
                if (updateData.subscriptionId) {
                    const planExists = await SubscriptionPlan.findOne({
                        subscriptionId: updateData.subscriptionId,
                        isActive: true
                    });

                    if (planExists) {
                        const subscription = await createVendorSubscription(
                            updatedVendor._id,
                            updateData.subscriptionId,
                            req.user.id
                        );
                        console.log('✅ Vendor subscription updated:', subscription._id);
                    } else {
                        console.warn('⚠️ Subscription plan not found, skipping subscription update');
                    }
                } else {
                    await VendorSubscription.findOneAndUpdate(
                        { vendorId: updatedVendor._id, status: 'active' },
                        {
                            status: 'cancelled',
                            cancelledAt: new Date(),
                            updatedAt: new Date()
                        }
                    );
                    console.log('✅ Vendor subscription cancelled');
                }
            } catch (subscriptionError) {
                console.error('❌ Error updating vendor subscription:', subscriptionError);
            }
        }

        // Update user account with all relevant fields
        try {
            const existingUser = await User.findOne({ vendorId: vendor._id });
            if (existingUser) {
                const userUpdateData = {};

                // Sync email
                if (updateData.email !== undefined) {
                    userUpdateData.email = updateData.email;
                }

                // Sync phone and username if phone changed
                if (newPhone && oldPhone !== newPhone) {
                    userUpdateData.username = newPhone;
                    userUpdateData.phone = newPhone;
                }

                if (Object.keys(userUpdateData).length > 0) {
                    await User.findByIdAndUpdate(existingUser._id, userUpdateData);
                    console.log('✅ User account updated');
                }
            }
        } catch (userError) {
            console.error('❌ Error updating user account:', userError);
        }

        // Get subscription name
        let subscriptionName = '';
        if (updatedVendor.subscriptionId) {
            try {
                const sub = await SubscriptionPlan.findOne({
                    subscriptionId: updatedVendor.subscriptionId,
                    isActive: true
                }).select('name');

                if (sub) {
                    subscriptionName = sub.name;
                }
            } catch (error) {
                console.error('Error fetching subscription:', error);
            }
        }

        // Format response
        const response = {
            _id: updatedVendor._id.toString(),
            id: updatedVendor.vendorId,
            vendorId: updatedVendor.vendorId,
            companyName: updatedVendor.companyName,
            contactPerson: updatedVendor.contactPerson,
            email: updatedVendor.email,
            phone: updatedVendor.phone || '',
            alternateMobile: updatedVendor.alternateMobile || '',
            gstNo: updatedVendor.gstNo || '',
            address: updatedVendor.address || '',
            categoryId: updatedVendor.categoryId,
            category: CATEGORIES[updatedVendor.categoryId] || 'Unknown',
            subscriptionId: updatedVendor.subscriptionId,
            subscription: subscriptionName,
            status: updatedVendor.status,
            isActive: true,
            createdAt: updatedVendor.createdAt
        };

        res.json({
            success: true,
            message: 'Vendor updated successfully',
            vendor: response
        });

    } catch (error) {
        console.error('Error updating vendor:', error);

        // ✅ Handle MongoDB duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const value = error.keyValue[field];

            let message = '';
            if (field === 'email') {
                message = `Email "${value}" is already registered. Please use a different email.`;
            } else if (field === 'phone') {
                message = `Phone number "${value}" is already registered. Please use a different phone number.`;
            } else {
                message = `${field} "${value}" already exists. Please use a different value.`;
            }

            return res.status(409).json({
                success: false,
                message: 'Duplicate entry',
                errors: [message],
                field: field
            });
        }

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
            message: 'Failed to update vendor',
            error: error.message
        });
    }
});

// ============ DELETE VENDOR (SOFT DELETE) ============
router.delete('/vendors/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        let vendor;
        if (mongoose.Types.ObjectId.isValid(id)) {
            vendor = await Vendor.findByIdAndUpdate(
                id,
                {
                    active: false,
                    status: 'inactive',
                    deletedAt: new Date()
                },
                { new: true }
            );
        } else {
            vendor = await Vendor.findOneAndUpdate(
                { vendorId: parseInt(id) },
                {
                    active: false,
                    status: 'inactive',
                    deletedAt: new Date()
                },
                { new: true }
            );
        }

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        // Also soft delete the corresponding user account
        try {
            const existingUser = await User.findOne({ vendorId: vendor._id });
            if (existingUser) {
                await User.findByIdAndUpdate(existingUser._id, {
                    active: false
                });
            }
        } catch (userError) {
            console.error('❌ Error deactivating user account:', userError);
        }

        res.json({
            success: true,
            message: 'Vendor deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete vendor',
            error: error.message
        });
    }
});

// ============ GET VENDOR PROFILE (FOR VENDORS) ============
router.get('/profile', isVendor, getVendorProfile);

export default router;