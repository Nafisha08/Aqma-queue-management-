import mongoose from "mongoose";

const cabinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // ✅ cabinNumber field - CRITICAL for filtering
  cabinNumber: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  }
}, {
  timestamps: true
});

// ✅ Optimized indexes for fast queries
cabinSchema.index({ vendorId: 1, isActive: 1 });
cabinSchema.index({ vendorId: 1, cabinNumber: 1 });
cabinSchema.index({ vendorId: 1, name: 1 });

export const Cabin = mongoose.model("Cabin", cabinSchema);

// Drop the old unique index on name if it exists (run once after model creation)
setTimeout(async () => {
  try {
    await Cabin.collection.dropIndex("name_1");
    console.log("✅ Dropped old unique index on cabin name");
  } catch (err) {
    // Index might not exist or already dropped, ignore error
    console.log("ℹ️ Note: name_1 index drop attempted (may not exist or already dropped)");
  }
}, 1000); // Delay to ensure connection is established