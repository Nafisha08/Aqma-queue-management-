// const express = require('express')
import express from 'express'
const app = express()


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/jokes', (req,res) => {
    const jokes = [
        {
            id: 1,
            title: 'A jokes',
            content:'This is a joke'
        },
        {
            id: 2,
            title: 'secound jokes',
            content:'This is a joke'
        },
        {
            id: 3,
            title: 'A jokes',
            content:'This is a joke'
        },
        {
            id: 4,
            title: 'A jokes',
            content:'This is a joke'
        },
        {
            id: 5,
            title: 'A jokes',
            content:'This is a joke'
        },
        {
            id: 6,
            title: 'A jokes',
            content:'This is a joke'
        },

    ]
})
const port = process.env.PORT || 4000

app.listen(port, () => {
    console.log(`server at http://localhost: ${port}`)
})
