// const express = require('express')
import express from 'express'
const app = express()


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/jokes', (req,res) => {
    const
})
const port = process.env.PORT || 4000

app.listen(port, () => {
    console.log(`server at http://localhost: ${port}`)
})
