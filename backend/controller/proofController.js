const proofStorageService = require('../services/proofStorageService')

exports.uploadProofImage = async (req, res) => {
  try {
    const result = await proofStorageService.storeProofImage(req.body, req.user.id)
    res.status(201).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
}

exports.getProofImage = async (req, res) => {
  try {
    const result = await proofStorageService.getProofImageUrl(req.params.proofHash, req.user.id, req.query.agreementId, req.query.milestoneIndex)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
}
