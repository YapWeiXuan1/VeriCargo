export const SETTINGS_STORAGE_KEY = 'vericargo_settings'
export const SETTINGS_CHANGED_EVENT = 'vericargo:settings-changed'

export const DEFAULT_SETTINGS = Object.freeze({
  actionReminders: true,
  statusUpdates: true,
})

function normaliseSettings(value = {}) {
  return {
    actionReminders: value.actionReminders !== false,
    statusUpdates: value.statusUpdates !== false,
  }
}

export function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}'
    )

    return normaliseSettings(saved)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  const next = normaliseSettings(settings)

  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(next)
  )

  window.dispatchEvent(
    new CustomEvent(SETTINGS_CHANGED_EVENT, {
      detail: next,
    })
  )

  return next
}

export function resetSettings() {
  localStorage.removeItem(SETTINGS_STORAGE_KEY)

  const next = { ...DEFAULT_SETTINGS }

  window.dispatchEvent(
    new CustomEvent(SETTINGS_CHANGED_EVENT, {
      detail: next,
    })
  )

  return next
}