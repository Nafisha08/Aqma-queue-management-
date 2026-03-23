import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        required: true,
        unique: true
    },
    dailyTokenId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Active',
        enum: ['Active', 'Completed', 'Cancelled']
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    counterNumber: {
        type: Number,
        required: false
    },
    counterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counter',
        required: false
    },
    counterName: {
        type: String,
        required: false
    },
    // ✅ NEW: Add cabinId reference
    cabinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cabin',
        required: false,
        index: true
    },
    // ✅ NEW: Add cabinNumber for easier queries
    cabinNumber: {
        type: Number,
        required: false,
        index: true
    },
    // ✅ Keep cabin string for backward compatibility
    cabin: {
        type: String,
        required: false, // Changed from true to false
        trim: true,
        index: true
    },
    customerName: {
        type: String,
        required: false
    },
    mobileNo: {
        type: String,
        required: false
    },
    item: {
        type: [String],
        required: false,
        default: []
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi', 'online', 'Cash', 'Card', 'UPI', 'Online'],
        required: false
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than 0']
    },
    completedAt: {
        type: Date,
        default: null
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    calledAt: {
        type: Date,
        default: null
    },
    calledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// ✅ PERFORMANCE: Optimized indexes for fast queries
tokenSchema.index({ vendorId: 1, status: 1, date: -1 });
tokenSchema.index({ counterId: 1, status: 1, completedAt: -1 });
tokenSchema.index({ cabinId: 1, status: 1, completedAt: -1 }); // ✅ NEW INDEX
tokenSchema.index({ cabinNumber: 1, status: 1 }); // ✅ NEW INDEX
tokenSchema.index({ cabin: 1, date: 1, status: 1 });
tokenSchema.index({ vendorId: 1, cabin: 1, status: 1 });
tokenSchema.index({ createdAt: -1 }); // For sorting by latest

export const Token = mongoose.model("Token", tokenSchema);