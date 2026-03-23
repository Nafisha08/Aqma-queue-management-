import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        // Validate environment variables
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI environment variable is not defined. Please check your .env file.")
        }

        // Get base URI and clean it
        let uri = process.env.MONGODB_URI.trim()

        // Validate connection string format
        if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
            throw new Error("Invalid MongoDB URI format. Must start with 'mongodb://' or 'mongodb+srv://'")
        }

        // Handle database name in URI vs separate DB_NAME
        let finalUri = uri
        let databaseName = DB_NAME

        // Check if database name is already included in the URI
        const uriParts = uri.split('/')
        if (uriParts.length >= 4 && uriParts[3] && !uriParts[3].includes('?')) {
            // Database name is already in URI, extract it
            databaseName = uriParts[3].split('?')[0]
            // Remove database name from URI to append it properly later
            const baseUri = uriParts.slice(0, 3).join('/')
            const queryParams = uriParts[3].includes('?') ? '?' + uriParts[3].split('?')[1] : ''
            finalUri = baseUri + queryParams
        }

        // For MongoDB Atlas, append database name and connection options
        if (finalUri.startsWith('mongodb+srv://')) {
            // Check if URI already has query parameters
            if (finalUri.includes('?')) {
                finalUri = `${finalUri.split('?')[0]}/${databaseName}?${finalUri.split('?')[1]}`
            } else {
                finalUri = `${finalUri}/${databaseName}?retryWrites=true&w=majority`
            }
        } else {
            // For local MongoDB, just append database name
            finalUri = `${finalUri}/${databaseName}`
        }

        // Fix double slash issue
        finalUri = finalUri.replace(/\/\//g, '/')
        if (finalUri.startsWith('mongodb+srv:/')) {
            finalUri = finalUri.replace('mongodb+srv:/', 'mongodb+srv://')
        }

        // Modern connection options (compatible with MongoDB driver 4.x and 5.x)
        const options = {
            serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            maxPoolSize: 10, // Maintain up to 10 socket connections
            maxIdleTimeMS: 30000, // Close idle connections after 30s
            // Removed deprecated options:
            // - bufferMaxEntries (handled automatically by driver)
            // - bufferCommands (handled automatically by driver)
            // - ssl (automatically enabled for mongodb+srv://)
            // - sslValidate (replaced by tls options if needed)
            // - retryWrites (should be in connection string)
            // - retryReads (should be in connection string)
        }

        console.log(`🔄 Connecting to MongoDB...`)
        console.log(`📍 Database: ${databaseName}`)
        console.log(`🌐 URI: ${finalUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')} (password hidden)`)
        console.log(`🔗 Connection Type: ${finalUri.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : 'Local MongoDB'}`)

        const connectionInstance = await mongoose.connect(finalUri, options)

        console.log(`\n✅ MongoDB connected successfully!`)
        console.log(`🏠 DB HOST: ${connectionInstance.connection.host}`)
        console.log(`📊 DB NAME: ${connectionInstance.connection.name}`)
        console.log(`🔗 CONNECTION STATE: ${connectionInstance.connection.readyState}`)
        console.log(`🌍 CLUSTER: ${connectionInstance.connection.host.includes('mongodb.net') ? 'Atlas' : 'Local'}`)

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error.message)
        })

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected')
        })

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected')
        })

        // Handle process termination
        process.on('SIGINT', async () => {
            console.log('🛑 Received SIGINT, closing MongoDB connection...')
            await mongoose.connection.close()
            console.log('✅ MongoDB connection closed.')
            process.exit(0)
        })

        return connectionInstance

    } catch (error) {
        console.error("\n❌ MONGODB CONNECTION FAILED!")
        console.error("Error details:", error.message)

        // Provide specific troubleshooting information
        if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
            console.error("💡 SOLUTION: Check your MongoDB username and password in the connection string")
            console.error("   - For Atlas: Ensure user has 'Read and write' access to the database")
        } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
            console.error("💡 SOLUTION: Check your MongoDB cluster URL or ensure MongoDB is running locally")
            console.error("   - For Atlas: Verify cluster URL is correct and cluster is running")
        } else if (error.message.includes('Invalid scheme')) {
            console.error("💡 SOLUTION: MongoDB URI must start with 'mongodb://' or 'mongodb+srv://'")
        } else if (error.message.includes('connection timed out') || error.message.includes('ETIMEDOUT')) {
            console.error("💡 SOLUTION: Check network connectivity and firewall settings")
            console.error("   - For Atlas: Whitelist your IP address in Network Access")
        } else if (error.message.includes('not supported')) {
            console.error("💡 SOLUTION: Using deprecated MongoDB driver options")
            console.error("   - Update your connection code to use modern options")
        }

        console.error("\n🔧 TROUBLESHOOTING STEPS:")
        console.error("1. Check your .env file has correct MONGODB_URI")
        console.error("2. For local MongoDB: mongodb://localhost:27017")
        console.error("3. For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net")
        console.error("4. Ensure MongoDB service is running (if local)")
        console.error("5. Check network connectivity to MongoDB server")
        console.error("6. For Atlas: Verify IP whitelist and user permissions")
        console.error("7. Test connection with MongoDB Compass or mongosh")

        console.error("\n📋 ATLAS SPECIFIC CHECKS:")
        console.error("- Cluster is running (not paused)")
        console.error("- IP address is whitelisted (0.0.0.0/0 for testing)")
        console.error("- Database user has correct permissions")
        console.error("- Connection string copied correctly from Atlas dashboard")

        console.error("\nMONGO db connection failed !!! ", error)
        process.exit(1)
    }
}

export default connectDB