import mongoose from "mongoose";

const vendorSubscriptionSchema = new mongoose.Schema({



        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            index: true
        },
        vendorName: {
            type: String,
            required: true,
            trim: true
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            required: true
        },
        planName: {
            type: String,
            required: true,
            trim: true
        },
       
        
       
        price: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR', 'GBP']
        },
        status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive', 'expired', 'cancelled', 'pending']
        },
        paymentStatus: {
            type: String,
            default: 'pending',
            enum: ['pending', 'paid', 'failed', 'refunded']
        },
        autoRenew: {
            type: Boolean,
            default: false
        },
        renewalDate: {
            type: Date
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: {
            type: String,
            maxlength: 500
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
}, { timestamps: true })
export const vendorSubscription = mongoose.model("vendorSubscription", vendorSubscriptionSchema)