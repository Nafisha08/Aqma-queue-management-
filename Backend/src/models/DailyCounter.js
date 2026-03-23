import mongoose from "mongoose";

const dailyCounterSchema = new mongoose.Schema({
    counterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counter',
        required: true,
        index: true  // ✅ Individual index for faster queries
    },
    counterNumber: {
        type: Number,
        required: true,
        index: true  // ✅ Individual index for faster queries
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true  // ✅ Individual index for faster queries
    },
    lastTokenNumber: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// ✅ CRITICAL FIX: Use ONLY ONE compound unique index
// This ensures one counter can have only ONE record per date
dailyCounterSchema.index({ counterId: 1, date: 1 }, { unique: true });

// ✅ REMOVED the counterNumber + date index to prevent conflicts
// The old schema might have had: { counterNumber: 1, date: 1 } which conflicts

// ✅ Optional: Add this index for queries by counterNumber
dailyCounterSchema.index({ counterNumber: 1, date: 1 });

export const DailyCounter = mongoose.model("DailyCounter", dailyCounterSchema);