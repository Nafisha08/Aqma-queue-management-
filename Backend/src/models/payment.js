import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
 
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            required: true
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
}, { timestamps: true })
export const Payment = mongoose.model("Payment", paymentSchema)
