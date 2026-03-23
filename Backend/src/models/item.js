import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        default: 0,
        required: false
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: false
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive']
    }
}, { timestamps: true })

export const Item = mongoose.model("Item", itemSchema)