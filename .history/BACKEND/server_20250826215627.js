// const express = require('express')
import express from 'express'
const app = express()


app.get('/', (req, res) => {
    res.send('Hello World!')
})
const port=process.env.PORT||
app.listen(process.env.port, () => {
    console.log(`Example app listening on port ${port}`)
})
