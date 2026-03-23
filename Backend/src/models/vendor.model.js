import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
    // Updated field to match frontend
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    // Keep existing name field for backward compatibility
    name: {
        type: String,
        trim: true
    },
    // Add contact person field as frontend expects
    contactPerson: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique:true,
        validate: {
            validator: function (v) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email'
        }
    },
    phone: {
        type: String,
        default: '',
        trim: true,
        validate: {
            validator: function (v) {
                return v === '' || /^\d{10}$/.test(v);
            },
            message: 'Phone number must be exactly 10 digits or empty'
        }
    },
    alternateMobile: {
        type: String,
        default: '',
        trim: true,
        validate: {
            validator: function (v) {
                return v === '' || /^\d{10}$/.test(v);
            },
            message: 'Alternate mobile must be exactly 10 digits or empty'
        }
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    gstNo: {
        type: String,
        default: '',
        uppercase: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },
    categoryId: {
        type: Number,
        default: 1,
        validate: {
            validator: function (v) {
                return v > 0;
            },
            message: 'Category ID must be a positive number'
        }
    },
    subscriptionId: {
        type: Number,
        default: null
    },
    subscriptions: [{
        type: Number,
        ref: 'SubscriptionPlan'
    }],
    deletedAt: {
        type: Date,
        default: null
    },
    // ✅ FIXED: Simple sequential vendorId (1, 2, 3, 4...)
    vendorId: {
        type: Number,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
vendorSchema.virtual('categoryName').get(function () {
    const categories = {
        1: 'Medical',
        2: 'Shop',
        3: 'Juice Corner',
        4: 'Hospital',
        5: 'Restaurant',
        6: 'Pharmacy'
    };
    return categories[this.categoryId] || 'Unknown';
});

vendorSchema.virtual('displayName').get(function () {
    return this.companyName || this.name;
});

// ✅ FIXED: Pre-save middleware - Sequential ID generation (1, 2, 3, 4...)
vendorSchema.pre('save', async function (next) {
    // Generate sequential vendorId for new vendors
    if (this.isNew && !this.vendorId) {
        try {
            // Find the highest vendorId
            const lastVendor = await this.constructor
                .findOne()
                .sort({ vendorId: -1 })
                .select('vendorId')
                .lean();

            // Set next sequential ID (1, 2, 3, 4...)
            this.vendorId = lastVendor && lastVendor.vendorId ? lastVendor.vendorId + 1 : 1;
            
            console.log(`✅ Generated vendorId: ${this.vendorId} for ${this.companyName}`);
        } catch (error) {
            console.error('❌ Error generating vendorId:', error);
            return next(error);
        }
    }

    // Clean GST field
    if (this.gstNo) {
        this.gstNo = this.gstNo.toUpperCase().trim();
    }

    // Sync isActive with active
    if (this.isModified('isActive')) {
        this.active = this.isActive;
    }
    if (this.isModified('active')) {
        this.isActive = this.active;
    }

    // Sync status with isActive
    if (this.isModified('isActive')) {
        this.status = this.isActive ? 'active' : 'inactive';
    }

    next();
});

// Instance methods
vendorSchema.methods.softDelete = function () {
    this.isActive = false;
    this.active = false;
    this.status = 'inactive';
    this.deletedAt = new Date();
    return this.save();
};

vendorSchema.methods.restore = function () {
    this.isActive = true;
    this.active = true;
    this.status = 'active';
    this.deletedAt = null;
    return this.save();
};

// Static methods
vendorSchema.statics.findActive = function () {
    return this.find({ isActive: true, deletedAt: null });
};

vendorSchema.statics.findByCategory = function (categoryId) {
    return this.find({ categoryId, isActive: true, deletedAt: null });
};

// Indexes
vendorSchema.index({ categoryId: 1 });
vendorSchema.index({ isActive: 1, deletedAt: 1 });
vendorSchema.index({ createdAt: -1 });

export const Vendor = mongoose.model("Vendor", vendorSchema);