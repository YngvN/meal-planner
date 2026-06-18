import { FilterChip, LanguageSwitcher, ThemeToggle } from '../components'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import type { ScoringFactors } from '../features/settings/types'
import { setVisibleSlots, toggleAutoSuggest, toggleScoringFactor } from '../features/settings/settingsSlice'
import { MEAL_SLOT_ORDER, type MealSlot } from '../features/mealPlan/types'
import { useLanguage } from '../i18n'
import './Settings.scss'

/** All scoring factor keys in display order. */
const SCORING_FACTOR_KEYS: (keyof ScoringFactors)[] = [
  'pantryMatch',
  'leftoverIngredients',
  'prioritizeExpiring',
  'avoidRepetition',
  'recencyPenalty',
  'slotAffinity',
  'favoriteBoost',
]

/**
 * Settings page — user preferences for the meal planner and suggestion algorithm.
 * All changes take effect immediately and persist to localStorage.
 */
export function Settings() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const { visibleSlots, autoSuggestEnabled, scoringFactors } = useAppSelector(
    (s) => s.settings.mealPlanner,
  )

  function handleSlotToggle(slot: MealSlot) {
    if (visibleSlots.includes(slot)) {
      // Don't allow deselecting the last slot
      if (visibleSlots.length === 1) return
      dispatch(setVisibleSlots(visibleSlots.filter((s) => s !== slot)))
    } else {
      // Keep order stable (MEAL_SLOT_ORDER)
      dispatch(
        setVisibleSlots(MEAL_SLOT_ORDER.filter((s) => [...visibleSlots, slot].includes(s))),
      )
    }
  }

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.appearance')}</h2>

        <div className="settings-page__field">
          <div className="settings-page__row">
            <span className="settings-page__row-label">{t('settings.theme')}</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="settings-page__field">
          <div className="settings-page__row">
            <span className="settings-page__row-label">{t('settings.language')}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </section>

      {/* ── Meal Planner ──────────────────────────────────────────────────── */}
      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.mealPlanner')}</h2>

        {/* Visible slots */}
        <div className="settings-page__field">
          <label className="settings-page__label">{t('settings.visibleSlots')}</label>
          <div className="settings-page__chips">
            {MEAL_SLOT_ORDER.map((slot) => {
              const isLast = visibleSlots.length === 1 && visibleSlots.includes(slot)
              return (
                <FilterChip
                  key={slot}
                  active={visibleSlots.includes(slot)}
                  onClick={isLast ? undefined : () => handleSlotToggle(slot)}
                  className={isLast ? 'settings-page__chip--locked' : undefined}
                >
                  {t(`mealPlan.slot.${slot}`)}
                </FilterChip>
              )
            })}
          </div>
        </div>

        {/* Auto-suggest toggle */}
        <div className="settings-page__field">
          <label className="settings-page__toggle-label" htmlFor="auto-suggest-toggle">
            <span>{t('settings.autoSuggest')}</span>
            <button
              id="auto-suggest-toggle"
              type="button"
              role="switch"
              aria-checked={autoSuggestEnabled}
              className={`settings-page__toggle${autoSuggestEnabled ? ' settings-page__toggle--on' : ''}`}
              onClick={() => dispatch(toggleAutoSuggest())}
            >
              <span className="settings-page__toggle-knob" />
            </button>
          </label>
        </div>

        {/* Scoring factors — only shown when auto-suggest is on */}
        {autoSuggestEnabled && (
          <div className="settings-page__field settings-page__field--indented">
            <label className="settings-page__label">{t('settings.scoringFactors')}</label>
            <ul className="settings-page__factor-list">
              {SCORING_FACTOR_KEYS.map((key) => (
                <li key={key} className="settings-page__factor-item">
                  <label className="settings-page__factor-label">
                    <input
                      type="checkbox"
                      checked={scoringFactors[key]}
                      onChange={() => dispatch(toggleScoringFactor(key))}
                      className="settings-page__factor-checkbox"
                    />
                    <span>{t(`settings.factors.${key}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
