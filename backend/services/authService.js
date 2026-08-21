const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const supabase = require('./supabaseClient')
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const registerUser = async (email, password, fullName, role) => {

    const { data: existing } = await supabase.from('users').select('*').eq('company_email', email).single();
    if (existing) {
        const error = new Error('Email already registered')
        error.statusCode = 400
        throw error
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('users')
        .insert([{ full_name: fullName, company_email: email, password: hashedPassword, role: role }])
        .select()
        .single()

    if (error) {
        const err = new Error(error.message)
        err.statusCode = 500
        throw err
    }
    const token = jwt.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    })

    return {
        token,
        user: { id: data.id, fullName: data.full_name, email: data.email, role: data.role },
    }
}

const loginUser = async (email, password, rememberMe) => {
    const {data:user,error} = await supabase.from('users').select('*').eq('company_email', email).single();

    if(!user){
        const error = new Error('User not found')
        error.statusCode = 404
        throw error
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error('Invalid password')
        error.statusCode = 401
        throw error
    }
    const token = jwt.sign({ id: user.id, email: user.company_email }, process.env.JWT_SECRET, { expiresIn: rememberMe ? '30d' : '1d' } )

    return {
        token,
        user: { id: user.id, fullName: user.full_name, email: user.company_email, role: user.role },
    }
}

module.exports = { registerUser, loginUser }  