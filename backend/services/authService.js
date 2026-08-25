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

const updateProfile = async (userId, fullName, email) => {
    const { data, error } = await supabase
        .from('users')
        .update({ full_name: fullName, company_email: email })
        .eq('id', userId)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return { id: data.id, fullName: data.full_name, email: data.company_email, role: data.role }
}

const resetPassword = async (userId, currentPassword, newPassword) => {
    const { data: user, error: lookupError } = await supabase.from('users').select('password').eq('id', userId).single()
    if (lookupError || !user) throw new Error('User not found')
    if (!await bcrypt.compare(currentPassword, user.password)) {
        const error = new Error('Current password is incorrect')
        error.statusCode = 400
        throw error
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const { error } = await supabase.from('users').update({ password: hashedPassword }).eq('id', userId)
    if (error) throw new Error(error.message)
}

const searchCarriers = async (search = '') => {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, company_email, wallet_address')
        .ilike('role', 'carrier')
        .not('wallet_address', 'is', null)
        .limit(100)

    if (error) throw new Error(error.message)

    const query = search.trim().toLowerCase()
    return data
        .filter((carrier) => !query || [
            carrier.full_name,
            carrier.company_email,
            carrier.wallet_address,
        ].some((value) => value?.toLowerCase().includes(query)))
        .slice(0, 10)
        .map((carrier) => ({
            id: carrier.id,
            companyName: carrier.full_name,
            email: carrier.company_email,
            walletAddress: carrier.wallet_address.toLowerCase(),
        }))
}

module.exports = { registerUser, loginUser, updateProfile, resetPassword, searchCarriers }
