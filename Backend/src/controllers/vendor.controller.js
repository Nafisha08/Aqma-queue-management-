import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Vendor } from "../models/model.js"; // ✅ Import from model.js
import { SubscriptionPlan } from "../models/model.js";

const getVendorProfile = asyncHandler(async (req, res) => {
    console.log('🔍 GET /profile - User:', req.user);

    // Get vendorId from authenticated user
    const vendorId = req.user.vendorId;

    if (!vendorId) {
        throw new ApiError(400, "Vendor ID not found in token");
    }

    console.log('🔍 Looking for vendor with ID:', vendorId);

    // ✅ FIXED: Find vendor by ObjectId
    let vendor = await Vendor.findById(vendorId)
        .select('vendorId companyName contactPerson email phone alternateMobile gstNo address categoryId subscriptionId status createdAt')
        .lean();

    console.log('📦 Vendor found:', vendor);

    // ✅ NEW: If vendor not found, create a default profile from user data
    if (!vendor) {
        console.log('⚠️ Vendor profile not found, creating default profile...');

        try {
            // Get user data to populate vendor profile
            const { User } = await import("../models/model.js");
            const user = await User.findById(req.user.id).select('username email phone');

            // Create default vendor profile
            const newVendor = new Vendor({
                _id: vendorId, // Use existing vendorId from token
                companyName: user?.username || 'Not Set',
                contactPerson: user?.username || 'Not Set',
                email: user?.email || 'vendor@example.com',
                phone: user?.phone || user?.username || '',
                categoryId: 1, // Default: Medical
                status: 'active',
                active: true
            });

            await newVendor.save();
            vendor = newVendor.toObject();

            console.log('✅ Default vendor profile created:', vendor._id);
        } catch (createError) {
            console.error('❌ Error creating vendor profile:', createError);
            throw new ApiError(404, "Vendor profile not found and could not be created");
        }
    }

    // Get category name
    const categories = {
        1: 'Medical',
        2: 'Shop',
        3: 'Juice Corner',
        4: 'Hospital',
        5: 'Restaurant',
        6: 'Pharmacy'
    };

    // Get subscription name if available
    let subscriptionName = '';
    if (vendor.subscriptionId) {
        try {
            const sub = await SubscriptionPlan.findOne({
                subscriptionId: vendor.subscriptionId,
                isActive: true
            }).select('name').lean();

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
        companyName: vendor.companyName || 'Not Set',
        contactPerson: vendor.contactPerson || 'Not Set',
        email: vendor.email || 'Not Set',
        phone: vendor.phone || '',
        alternateMobile: vendor.alternateMobile || '',
        gstNo: vendor.gstNo || '',
        address: vendor.address || '',
        categoryId: vendor.categoryId || 1,
        category: categories[vendor.categoryId] || 'Unknown',
        subscriptionId: vendor.subscriptionId || null,
        subscription: subscriptionName || 'No subscription',
        status: vendor.status || 'active',
        isActive: true,
        createdAt: vendor.createdAt || new Date()
    };

    console.log('✅ Vendor profile retrieved:', response.companyName);

    return res.status(200).json(
        new ApiResponse(200, { vendor: response }, "Vendor profile retrieved successfully")
    );
});

export { getVendorProfile };