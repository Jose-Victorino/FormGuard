const THEME_KEY = 'formguard-theme'

export const SKELETON_COLORS = {
  light: { baseColor: 'hsl(229, 2%, 87%)', highlightColor: 'hsl(0, 0%, 73%)' },
  dark: { baseColor: 'hsl(229, 10%, 24%)', highlightColor: 'hsl(229, 4%, 18%)' },
}

/** @returns {'light' | 'dark'} */
export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** @param {'light' | 'dark'} theme */
export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch { /* ignore quota / private mode */ }
}

/** @param {'light' | 'dark'} theme */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}
