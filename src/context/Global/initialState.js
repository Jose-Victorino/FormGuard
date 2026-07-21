import { getStoredTheme } from '@/library/theme'

export const initialState = {
  theme: getStoredTheme(),
  selectionModalToggle: false,
}
