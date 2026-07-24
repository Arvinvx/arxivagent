import express from 'express';
import session from 'express-session'
import dotenv from 'dotenv'
import cors from 'cors'
import { auth } from './auth/auth.js'
const app = express()
const PORT = 3000

dotenv.config({path : '.env'})

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,  
}))

app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
})) 
    



app.use('/auth',auth)


app.listen(PORT, () => {
    console.log(`Server is running inside http://localhost:${PORT}/`)
})

