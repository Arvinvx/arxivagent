import express from 'express'
import { signup, logout, login , verify , generateapikey } from './authController.js'


export const auth = express.Router()


auth.post('/login',login)
auth.post('/signup',signup)
auth.post('/logout',logout)
auth.post('/verify-key',verify)
auth.post('/generate-api-key',generateapikey)