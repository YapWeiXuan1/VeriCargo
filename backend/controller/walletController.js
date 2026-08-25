const walletService = require("../services/walletService");

exports.getWalletStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const result = await walletService.getWalletStatus(userId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
}
exports.requestWalletChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { walletAddress } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        const result = await walletService.requestWalletChallenge(userId, walletAddress);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
}
exports.verifyWalletChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { challengeId, signature } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        if (!challengeId || !signature) {
            return res.status(400).json({ error: 'Challenge ID and signature are required' });
        }
        const result = await walletService.verifyWalletChallenge(challengeId, signature, userId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
    }
}
