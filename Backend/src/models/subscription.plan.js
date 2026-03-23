import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
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
        required: true
    },
    duration: {
        type: Number,
        required: true // in days
    },
    features: {
        type: [String],
        default: []
    },
    maxTokens: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive']
    },
    // Add subscriptionId field for unique identification
    subscriptionId: {
        type: Number,
        unique: true,
        sparse: true,
        default: null
    }
}, { timestamps: true });

// Pre-save middleware to generate subscriptionId
subscriptionSchema.pre('save', async function (next) {
    // Generate subscriptionId for new subscriptions
    if (this.isNew && !this.subscriptionId) {
        try {
            // Use counter collection to get next subscription ID
            const Counter = mongoose.model('Counter') || mongoose.model('Counter', new mongoose.Schema({
                _id: { type: String, required: true },
                sequence_value: { type: Number, default: 0 }
            }));

            const counter = await Counter.findOneAndUpdate(
                { _id: 'subscriptionId' },
                { $inc: { sequence_value: 1 } },
                { new: true, upsert: true }
            );

            this.subscriptionId = counter.sequence_value;
        } catch (error) {
            console.error('Error generating subscriptionId:', error);
            // Fallback to timestamp-based ID
            this.subscriptionId = Date.now();
        }
    }

    next();
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
