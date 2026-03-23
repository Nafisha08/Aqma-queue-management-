import mongoose from "mongoose"

const counterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: ''
    },
    purpose: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'general'
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
         required: true
    },
    cabinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cabin',
        default: null
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive']
    }
}, {
    timestamps: true
})
// Index cabinId to allow fast lookups by cabin when needed
counterSchema.index({ vendorId: 1, cabinId: 1, status: 1 });

export const Counter = mongoose.model("Counter", counterSchema)
