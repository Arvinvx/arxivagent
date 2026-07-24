import validator from 'validator'
import bcrypt from 'bcryptjs'
import { supabase } from '../db/db.js'
import { hashKey } from '../hashkey.js'
import crypto from 'crypto';

export async function signup(req,res){
    let {name , email , password} = req.body
    if (!name || !email || !password){
        return res.status(400).json({error : "All fields are required"})
    }

    email = email.trim()
    name = name.trim()

    if (password.length < 8){
       return res.status(400).json({error : 'passwords need to be at least 8 characters long'})
    }

    if (!validator.isEmail(email)){
        return res.status(400).json({ error : "Email is not valid"})
    }

    try{
        const db = supabase
        const {data: existingUser , error} = await supabase
        .from('users')
        .select('id')
        .eq('email',email)

        if (existingUser?.length > 0){
            return res.status(400).json({error : `User with this email already exists please try another email`})
        }

        const hashed =  await bcrypt.hash(password,10)
        const {data : result , error : insertError} = await supabase
        .from('users')
        .insert({name,email, password : hashed})
        .select()

        if (insertError){
            if (insertError.code === '23505'){
            return res.status(400).json({error : "User with this email already exists"})
    }
            return res.status(500).json({error : "Registration actually failed. Please try again."})
        }

        req.session.userId = result[0].id
        res.status(201).json({message : 'User registered.'})

    }catch(err){
        console.log(err)
        return res.status(500).json({error : "Registration didnt failed. Please try again."})
    }
}

export async function login(req,res){
    let {email , password } = req.body

    if (!email || !password){
        return res.status(400).json({error: "All fields are required"})
    }

     email = email.trim()

    try {
        const db = supabase
        const {data : user , error} = await supabase
        .from('users')
        .select('id,password')
        .eq('email',email)

        if (!user || user.length === 0){
            return res.status(401).json({error : "Invalid credentials"})

        }

            const isValid = await bcrypt.compare(password, user[0].password)

            if(!isValid){
                return res.status(401).json({error: "Password is wrong"})
            }

            req.session.userId = user[0].id
            res.json({message : 'Logged in'})

    }catch(err){
        return res.status(500).json({error : "Login failed. Please try again."})
    }
}


export async function logout(req,res){
    req.session.destroy(()=>{
        res.json({ message : "Logged out" })
    })
}  


export async function verify(req, res){
    const authHeader = req.headers.authorization; 
    const parts = authHeader.split(' ');
    const key = parts[1]; 
    const hashed = hashKey(key)


    const {data :user ,error } = await supabase
    .from('api_keys')
    .select('user_id,revoked')
    .eq('hashed_key',hashed)

    if (error){ // if any error happens
        return res.status(500).json({error : "..."})
    }

    if (!user || user.length === 0){
        return res.status(401).json({error : "There is something wrong mate (user dont exist)"})
    } // user dont exicst

    
    if (user[0].revoked){
        return res.status(401).json({error : "This key has been revoked."})
    } // the key even works? response is a {} that the array is isnide so we use [0] and revoked return the revoke only

    return res.status(200).json({
    valid: true,
    userId: user[0].user_id
})
}

export async function generateapikey(req,res){
    const user_id = req.session.userId;
    if (!user_id){
        return res.status(400).json({error :  'Please login first'})
    }

    const api = crypto.randomBytes(16).toString('hex');
    const apikey = `arx_${api}`
    let hashed_key = hashKey(apikey)

    const {data : apistuff , error} = await supabase
    .from('api_keys')
    .insert({ user_id, hashed_key, revoked: false })
    .select()

    if (error){
        return res.status(400).json({error : "something went wrong"})
    }

    return res.status(200).json({Key : `${apikey}`})
}