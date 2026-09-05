const { createShipmentService } = require('../services/shipmentService')
const service = createShipmentService()
const handle = (operation) => async (req, res) => {
  try { res.json(await operation(req)) }
  catch (error) { res.status(error.statusCode || 503).json({ message: error.statusCode ? error.message : 'Unable to process shipment information. Please retry.' }) }
}
exports.create = handle(async (req) => ({ shipment: await service.create(req.user.id, req.body) }))
exports.forAgreement = handle(async (req) => ({ shipment: await service.forAgreement(req.user.id, req.params.agreementId) }))
