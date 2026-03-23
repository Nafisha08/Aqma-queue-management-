# MongoDB Connection Setup Guide

## For MongoDB Atlas (Cloud)

### 1. Create MongoDB Atlas Account
- Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
- Create a free account and cluster

### 2. Get Connection String
- Go to "Clusters" → "Connect"
- Choose "Connect your application"
- Copy the connection string

### 3. Update .env File
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
```

**Important:** Do NOT include the database name in the URI. The application will append it automatically.

### 4. Whitelist Your IP
- In Atlas Dashboard: "Network Access"
- Add IP Address: `0.0.0.0/0` (for development) or your specific IP

### 5. Create Database User
- In Atlas Dashboard: "Database Access"
- Create user with "Read and write" permissions

## For Local MongoDB

### 1. Install MongoDB
- Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)

### 2. Start MongoDB Service
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 3. Update .env File
```env
MONGODB_URI=mongodb://localhost:27017
```

## Connection String Formats

### Atlas Format
```
mongodb+srv://username:password@cluster.mongodb.net
```
- Automatically handles SSL
- Includes replica set configuration
- Database name appended by application

### Local Format
```
mongodb://localhost:27017
```
- No authentication required (development)
- Database name appended by application

### With Authentication (Local/Production)
```
mongodb://username:password@localhost:27017
```

## Troubleshooting

### Common Atlas Issues

1. **Authentication Failed**
   - Check username/password
   - Verify user has correct permissions
   - Ensure IP is whitelisted

2. **Connection Timeout**
   - Check cluster is not paused
   - Verify network connectivity
   - Try different network/VPN

3. **Invalid URI**
   - Must start with `mongodb://` or `mongodb+srv://`
   - Remove database name from URI (appended automatically)

### Testing Connection

Run this to test your connection:
```javascript
const mongoose = require('mongoose');

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI + '/test');
        console.log('✅ Connection successful!');
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use environment-specific credentials**
3. **Restrict IP access** in production
4. **Use strong passwords**
5. **Enable SSL validation** in production
6. **Monitor connection logs**

## Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net

# Optional (set in constants.js)
DB_NAME=token_management_system
```

The application automatically:
- Appends database name to URI
- Adds Atlas-specific connection options
- Handles SSL configuration
- Provides detailed error messages
