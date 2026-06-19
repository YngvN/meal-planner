import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { MealSlot } from '../mealPlan/types'
import type { Settings, ScoringFactors } from './types'

/** Infer country code from browser language (e.g. "no" → "NO", "en-US" → "US"). */
function inferCountry(): string {
  const lang = navigator.language ?? 'en'
  const parts = lang.split('-')
  return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase()
}

const DEFAULT_SETTINGS: Settings = {
  mealPlanner: {
    visibleSlots: ['breakfast', 'lunch', 'dinner', 'snack'],
    autoSuggestEnabled: true,
    scoringFactors: {
      pantryMatch: true,
      leftoverIngredients: true,
      prioritizeExpiring: true,
      avoidRepetition: true,
      recencyPenalty: true,
      favoriteBoost: true,
      slotAffinity: true,
    },
  },
  country: inferCountry(),
  preferredCurrency: 'NOK',
}

/** Load settings from localStorage, merging deeply with defaults so new keys always have values. */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('meal-planner-settings')
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      mealPlanner: {
        ...DEFAULT_SETTINGS.mealPlanner,
        ...parsed.mealPlanner,
        scoringFactors: {
          ...DEFAULT_SETTINGS.mealPlanner.scoringFactors,
          ...parsed.mealPlanner?.scoringFactors,
        },
      },
      country: parsed.country ?? DEFAULT_SETTINGS.country,
      preferredCurrency: parsed.preferredCurrency ?? DEFAULT_SETTINGS.preferredCurrency,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadSettings,
  reducers: {
    /** Replace the visible slots list (at least one slot must remain). */
    setVisibleSlots(state, action: PayloadAction<MealSlot[]>) {
      if (action.payload.length === 0) return
      state.mealPlanner.visibleSlots = action.payload
    },

    /** Toggle the auto-suggest feature on or off. */
    toggleAutoSuggest(state) {
      state.mealPlanner.autoSuggestEnabled = !state.mealPlanner.autoSuggestEnabled
    },

    /** Toggle a single scoring factor on or off. */
    toggleScoringFactor(state, action: PayloadAction<keyof ScoringFactors>) {
      const key = action.payload
      state.mealPlanner.scoringFactors[key] = !state.mealPlanner.scoringFactors[key]
    },

    /** Set the user's country code (ISO 3166-1 alpha-2, e.g. "NO"). */
    setCountry(state, action: PayloadAction<string>) {
      state.country = action.payload.toUpperCase()
    },

    /** Set the preferred currency code (e.g. "NOK", "USD"). */
    setPreferredCurrency(state, action: PayloadAction<string>) {
      state.preferredCurrency = action.payload.toUpperCase()
    },
  },
})

export const {
  setVisibleSlots, toggleAutoSuggest, toggleScoringFactor,
  setCountry, setPreferredCurrency,
} = settingsSlice.actions
export default settingsSlice.reducer
