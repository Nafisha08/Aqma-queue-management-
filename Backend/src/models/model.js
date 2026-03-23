import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

// Import models from their respective files
import { User } from './user.model.js'
import { Token } from './Token.js'
import { Vendor } from './vendor.model.js'
import { Subscription as SubscriptionPlan } from './subscription.plan.js'
import { vendorSubscription as VendorSubscription } from './vendor.subscription.js'
import { Counter } from './counter.js'
import { Item } from './item.js'
import { Payment } from './payment.js'
import { Cabin } from './Cabin.js'

// 🧩 Collection model for persistent collection tracking
const collectionSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        unique: true // One collection document per vendor
    },
    cashCollection: {
        type: Number,
        default: 0
    },
    onlineCollection: {
        type: Number,
        default: 0
    },
    totalCollection: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

const Collection = mongoose.model('Collection', collectionSchema)

// Hash passwords before saving
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
}

// Initialize default data
const initializeDefaultData = async () => {
    try {
        console.log('Initializing default data...')

        // Create default users if they don't exist
        const defaultUsers = [
            {
                username: '9110053531',
                password: '123456789',
                role: 'superadmin',
                email: 'superadmin@gmail.com'
            }
        ]

        for (const userData of defaultUsers) {
            try {
                const existingUser = await User.findOne({ username: userData.username })
                if (!existingUser) {
                    const newUser = new User(userData)
                    await newUser.save()
                    console.log(`Default user ${userData.username} created successfully`)
                } else {
                    console.log(`User ${userData.username} already exists`)
                }
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`User ${userData.username} already exists(duplicate key)`)
                } else {
                    throw error
                }
            }
        }

        // Create default subscription plans if they don't exist
        const planCount = await SubscriptionPlan.countDocuments()
        if (planCount === 0) {
            console.log('Creating default subscription plans...')
            await SubscriptionPlan.create([
                {
                    name: 'Basic',
                    description: 'Basic plan with limited features',
                    price: 49.99,
                    duration: 30,
                    features: ['5 users', '10 items', '3 counters'],
                    status: 'active'
                },
                {
                    name: 'Standard',
                    description: 'Standard plan with more features',
                    price: 99.99,
                    duration: 30,
                    features: ['10 users', '50 items', '5 counters'],
                    status: 'active'
                },
                {
                    name: 'Premium',
                    description: 'Premium plan with all features',
                    price: 199.99,
                    duration: 30,
                    features: ['Unlimited users', 'Unlimited items', 'Unlimited counters'],
                    status: 'active'
                }
            ])
            console.log('Default subscription plans created successfully')
        }

        // Create default vendor if doesn't exist
        const vendorCount = await Vendor.countDocuments()
        if (vendorCount === 0) {
            console.log('Creating default vendor...')
            const vendor = await Vendor.create({
                name: 'Demo Vendor',
                contactPerson: 'Demo Contact',
                companyName: 'Demo Company',
                gender: 'Male',
                email: 'demo@vendor.com',
                phone: '1234567890',
                address: '123 Vendor St, City',
                gstNo: 'GST123456789',
                active: true,
                categoryId: 1
            })

            // Create vendor user
            const existingVendorUser = await User.findOne({ username: '9876543210' })
            if (!existingVendorUser) {
                const vendorUser = new User({
                    username: '9876543210',
                    password: 'vendor123',
                    role: 'vendor',
                    vendorId: vendor._id,
                    email: 'vendor@example.com'
                })
                await vendorUser.save()
                console.log('Default vendor user created successfully')
            }

            console.log('Default vendor created successfully')
        }

        console.log('✅ Default data initialization completed')
    } catch (error) {
        console.error('❌ Error initializing default data:', error)
        throw error
    }
}

// Export models and functions
export {
    initializeDefaultData,
    User,
    Vendor,
    SubscriptionPlan,
    VendorSubscription,
    Counter,
    Item,
    Token,
    Payment,
    Cabin,
    Collection // ✅ Added export here to fix import error
}