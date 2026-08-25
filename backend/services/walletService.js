const crypto = require("node:crypto");
const { getAddress, verifyMessage, } = require('ethers')
const supabase = require('./supabaseClient')
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

exports.getWalletStatus = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select("wallet_address, wallet_verified_at")
            .eq('id', userId)
            .single();
        if (error) {
            throw new Error('Error checking wallet existence: ' + error.message);
        }
        return {
            hasLinkedWallet:
                Boolean(data.wallet_address),

            walletAddress:
                data.wallet_address?.toLowerCase() ??
                null,

            verifiedAt:
                data.wallet_verified_at ?? null,
        };
    } catch (error) {
        throw new Error('Error checking wallet existence: ' + error.message);
    }
}

exports.requestWalletChallenge = async (userId, walletAddress) => {
    try {
        let normalisedAddress
        try {
            normalisedAddress = getAddress(walletAddress).toLowerCase()
        } catch {
            const error = new Error('Invalid MetaMask wallet address')
            error.statusCode = 400
            throw error
        }

        // Reject another user's verified wallet before asking the user to sign.
        // The unique constraint checked again during verification remains the
        // final protection against simultaneous linking attempts.
        const { data: existingWalletOwner, error: ownerLookupError } = await supabase
            .from('users')
            .select('id')
            .eq('wallet_address', normalisedAddress)
            .neq('id', userId)
            .maybeSingle()

        if (ownerLookupError) {
            throw new Error(`Unable to check wallet ownership: ${ownerLookupError.message}`)
        }

        if (existingWalletOwner) {
            const error = new Error('This MetaMask wallet is already linked to another user')
            error.statusCode = 409
            throw error
        }

        const issuedAt = new Date()
        const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000)
        const { error: revokeError } = await supabase
            .from('wallet_link_challenges')
            .update({ revoked_at: issuedAt.toISOString() })
            .eq('user_id', userId)
            .is('used_at', null)
            .is('revoked_at', null)

        if (revokeError) throw new Error(`Unable to revoke old challenge: ${revokeError.message}`)

        const nonce = crypto.randomBytes(16).toString('hex');
        const message = [
            "Supply Chain Escrow Wallet Verification",
            "",
            "Sign this message to link your MetaMask wallet.",
            "This action does not transfer funds or require gas.",
            "",
            `User ID: ${userId}`,
            `Wallet: ${normalisedAddress}`,
            `Nonce: ${nonce}`,
            `Issued At: ${issuedAt.toISOString()}`,
            `Expiration Time: ${expiresAt.toISOString()}`,
        ].join("\n");
        const { data, error } = await supabase.from('wallet_link_challenges')
            .insert({
                user_id: userId,
                wallet_address: normalisedAddress,
                nonce,
                message,
                expires_at: expiresAt
            })
            .select('id, message, expires_at')
            .single()
        if (error) throw new Error(`Unable to create challenge: ${error.message}`)
        return {
            challengeId: data.id,
            message: data.message,
            expiresAt: data.expires_at
        }

    } catch (error) {
        const wrappedError = new Error('Error requesting wallet challenge: ' + error.message)
        wrappedError.statusCode = error.statusCode || 500
        throw wrappedError
    }

}
exports.verifyWalletChallenge = async (challengeId, signature, userId) => {
    try {
        if (!challengeId || !signature || !userId) {
            throw new Error(
                'Challenge ID, signature and user ID are required'
            )
        }

        const now = new Date()
        const nowIso = now.toISOString()
        const { data: challenge, error: fetchError } = await supabase
            .from('wallet_link_challenges')
            .select(`*`)
            .eq('id', challengeId)
            .eq('user_id', userId)
            .is('used_at', null)
            .is('revoked_at', null)
            .maybeSingle()

        if (fetchError) throw new Error(`Unable to fetch challenge: ${fetchError.message}`)


        if (!challenge) throw new Error('Challenge was not found, revoked or already used')


        if (new Date(challenge.expires_at).getTime() <= now.getTime()) throw new Error('Challenge has expired. Please create a new challenge.')

        let recoveredAddress
        let expectedAddress

        try {
            recoveredAddress = getAddress(verifyMessage(challenge.message, signature)).toLowerCase()

            expectedAddress = getAddress(challenge.wallet_address).toLowerCase()
        } catch {
            throw new Error('Invalid MetaMask signature')
        }
        if (recoveredAddress !== expectedAddress) throw new Error('The signature does not belong to the selected wallet')

        const {
            data: consumedChallenge, error: consumeError } = await supabase
                .from('wallet_link_challenges')
                .update({
                    used_at: nowIso
                })
                .eq('id', challengeId)
                .eq('user_id', userId)
                .is('used_at', null)
                .is('revoked_at', null)
                .gt('expires_at', nowIso)
                .select('id')
                .maybeSingle()

        if (consumeError) throw new Error(`Unable to consume challenge: ${consumeError.message}`)

        if (!consumedChallenge) throw new Error('Challenge has expired, been revoked or already been used')

        const { data: linkedUser, error: linkError } = await supabase
            .from('users')
            .update({
                wallet_address: expectedAddress,
                wallet_verified_at: nowIso
            })
            .eq('id', userId)
            .is('wallet_address', null)
            .select(`id,wallet_address,wallet_verified_at`)
            .maybeSingle()

        if (linkError) {
            if (linkError.code === '23505') {
                throw new Error(
                    'This wallet is already linked to another user'
                )
            }

            throw new Error(
                `Unable to link wallet: ${linkError.message}`
            )
        }

        if (!linkedUser) {
            throw new Error(
                'This user already has a registered wallet'
            )
        }
        return {
            success: true,
            message: 'Wallet linked successfully',
            walletAddress: linkedUser.wallet_address,
            verifiedAt: linkedUser.wallet_verified_at
        }
    } catch (error) {
        throw new Error(
            `Error verifying wallet challenge: ${error.message}`
        )
    }
}
