import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: ''
    },
    username: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: 'Username must be exactly 10 digits (phone number)'
        }
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'vendor', 'superadmin', 'receptionist', 'user', 'counter'],
        default: 'user'
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        default: null
    },

    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return !v || v === '' || /^\d{10}$/.test(v);
            },
            message: 'Phone number must be exactly 10 digits or empty'
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    counterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Counter',
        default: null
    },
    cabinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cabin',
        default: null
    },
    userType: {
        type: [String],
        enum: ['cabin', 'counter'],
        default: ['counter'],
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0 && v.every(type => ['cabin', 'counter'].includes(type));
            },
            message: 'userType must be an array containing only "cabin" or "counter"'
        }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
})

//bcrypt code
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    console.log(`Hashing password for user: ${this.username}`)
    this.password = await bcrypt.hash(this.password, 10)
    console.log(`Password hashed for user: ${this.username}`)
    next()
})

//define custom method
userSchema.methods.isPasswordCorrect = async function (password) {
    console.log(`Comparing password for user: ${this.username}, stored hash: ${this.password.substring(0, 10)}...`)
    const result = await bcrypt.compare(password, this.password)
    console.log(`Password comparison result: ${result}`)
    return result
}

//jwt tokens
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET || 'your-secret-key',
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d'
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key',
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
        }
    )
}

export const User = mongoose.model("User", userSchema)
