import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        default: '#007bff',
        trim: true
    }
}, {
    timestamps: true
});

// Index for better performance
categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

// Static method to find active categories
categorySchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
};

// Static method to find by name
categorySchema.statics.findByName = function (name) {
    return this.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
};

// Pre-save middleware to ensure display order is unique
categorySchema.pre('save', async function (next) {
    if (this.isNew && this.displayOrder === 0) {
        // Auto-assign display order
        const lastCategory = await this.constructor.findOne({}, {}, { sort: { 'displayOrder': -1 } });
        this.displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 1;
    }
    next();
});

export const Category = mongoose.model("Category", categorySchema);
