const notifications = require('../services/notificationService')

function fail(res, error) {
  if (!error.statusCode) console.error('Notification API error:', error.message)
  return res.status(error.statusCode || 500).json({ message: error.message || 'Notification request failed.' })
}

exports.list = async (req, res) => {
  try { return res.json({ notifications: await notifications.list(req.user.id) }) }
  catch (error) { return fail(res, error) }
}

exports.sync = async (req, res) => {
  try { return res.json({ notifications: await notifications.sync(req.user.id, req.body.notifications) }) }
  catch (error) { return fail(res, error) }
}

exports.markRead = async (req, res) => {
  try { await notifications.markRead(req.user.id, req.params.id); return res.status(204).send() }
  catch (error) { return fail(res, error) }
}

exports.markAllRead = async (req, res) => {
  try { await notifications.markAllRead(req.user.id); return res.status(204).send() }
  catch (error) { return fail(res, error) }
}

exports.dismiss = async (req, res) => {
  try { await notifications.dismiss(req.user.id, req.params.id); return res.status(204).send() }
  catch (error) { return fail(res, error) }
}

exports.dismissAll = async (req, res) => {
  try { await notifications.dismissAll(req.user.id); return res.status(204).send() }
  catch (error) { return fail(res, error) }
}
