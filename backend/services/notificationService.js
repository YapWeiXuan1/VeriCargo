const supabase = require('./supabaseClient')

const allowedTypes = new Set(['wallet', 'fund', 'review', 'refund', 'proof', 'claim', 'waiting', 'info'])

function clean(item) {
  if (!item || typeof item !== 'object') throw Object.assign(new Error('Invalid notification.'), { statusCode: 400 })
  const notificationKey = String(item.notificationKey || '').slice(0, 160)
  const type = String(item.type || 'info')
  const title = String(item.title || '').slice(0, 180)
  const detail = String(item.detail || '').slice(0, 500)
  const targetPath = String(item.targetPath || '')
  if (!notificationKey || !title || !detail || !targetPath.startsWith('/') || !allowedTypes.has(type)) {
    throw Object.assign(new Error('Invalid notification fields.'), { statusCode: 400 })
  }
  return {
    notification_key: notificationKey, type, title, detail,
    target_path: targetPath.slice(0, 200), icon: String(item.icon || type).slice(0, 40),
    agreement_id: item.agreementId == null ? null : Number(item.agreementId),
    milestone_index: item.milestoneIndex == null ? null : Number(item.milestoneIndex),
  }
}

async function list(userId) {
  const { data, error } = await supabase.from('notifications').select('*')
    .eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function sync(userId, input) {
  if (!Array.isArray(input) || input.length > 50) throw Object.assign(new Error('Notifications must be a list of at most 50 items.'), { statusCode: 400 })
  const items = input.map(clean)
  const keys = items.map((item) => item.notification_key)
  const { data: existing, error: fetchError } = keys.length
    ? await supabase.from('notifications').select('notification_key').eq('user_id', userId).in('notification_key', keys)
    : { data: [], error: null }
  if (fetchError) throw fetchError
  const existingKeys = new Set((existing || []).map((row) => row.notification_key))
  const newRows = items.filter((item) => !existingKeys.has(item.notification_key)).map((item) => ({ ...item, user_id: userId }))
  if (newRows.length) {
    const { error } = await supabase.from('notifications').insert(newRows)
    if (error) throw error
  }
  return list(userId)
}

async function markRead(userId, id) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

async function markAllRead(userId) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  if (error) throw error
}

async function dismiss(userId, id) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('notifications').update({ is_active: false, read_at: now, updated_at: now }).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

async function dismissAll(userId) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('notifications').update({ is_active: false, read_at: now, updated_at: now }).eq('user_id', userId).eq('is_active', true)
  if (error) throw error
}

module.exports = { list, sync, markRead, markAllRead, dismiss, dismissAll }
