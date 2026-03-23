// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from './app.js'

dotenv.config({
    path: './.env',
    encoding: 'utf16le'
})

connectDB()
    .then(async () => {
        // Initialize default data after DB connection
        const { initializeDefaultData } = await import('./models/model.js')
        await initializeDefaultData()

        app.on('error', (error) => {
            console.log("Express app error: ", error);
            throw error
        })

        const PORT = process.env.PORT || 8000

        app.listen(PORT, () => {
            console.log(`⚙️ Server is running at port : ${PORT}`);
            console.log(`🚀 Token Management System is active`);
            console.log(`📱 API endpoints available at http://localhost:${PORT}/api/`);
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })








    
/*
Previous implementation for reference:

import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()
*/