import { useEffect, useState } from 'react'
import { Copy, X } from 'lucide-react'
import { Button, FilterChip, Input, LanguageSwitcher, ThemeToggle } from '../components'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  fetchCurrentUser,
  updateUserEmail,
  updateUsername,
  updateUserPassword,
} from '../features/auth/authSlice'
import type { ScoringFactors } from '../features/settings/types'
import { setVisibleSlots, toggleAutoSuggest, toggleScoringFactor } from '../features/settings/settingsSlice'
import {
  createInviteCode,
  fetchAppSettings,
  fetchInviteCodes,
  fetchUsers,
  revokeInviteCode,
  updateAppSettings,
  updateUserRole,
} from '../features/settings/adminSlice'
import { MEAL_SLOT_ORDER, type MealSlot } from '../features/mealPlan/types'
import { useLanguage } from '../i18n'
import './Settings.scss'

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
 * Settings page — profile, appearance, meal planner prefs, and (for admins)
 * global app controls.
 */
export function Settings() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const user = useAppSelector((s) => s.auth.user)
  const authStatus = useAppSelector((s) => s.auth.status)
  const authError = useAppSelector((s) => s.auth.error)
  const { visibleSlots, autoSuggestEnabled, scoringFactors } = useAppSelector(
    (s) => s.settings.mealPlanner,
  )
  const { appSettings, inviteCodes, users } = useAppSelector((s) => s.admin)

  // ── Profile form state ─────────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState(user?.username ?? '')
  const [newEmail, setNewEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // ── Admin data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.role === 'admin') {
      dispatch(fetchAppSettings())
      dispatch(fetchInviteCodes())
      dispatch(fetchUsers())
    }
  }, [user?.role, dispatch])

  // ── Profile handlers ───────────────────────────────────────────────────────
  async function handleSaveUsername() {
    if (newUsername.trim() && newUsername !== user?.username) {
      await dispatch(updateUsername(newUsername.trim()))
      dispatch(fetchCurrentUser())
    }
  }

  async function handleSaveEmail() {
    if (newEmail.trim() && newEmail !== user?.email) {
      await dispatch(updateUserEmail(newEmail.trim()))
      setEmailSent(true)
    }
  }

  async function handleSavePassword() {
    if (newPassword.length >= 6) {
      await dispatch(updateUserPassword(newPassword))
      setNewPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    }
  }

  // ── Slot toggle ────────────────────────────────────────────────────────────
  function handleSlotToggle(slot: MealSlot) {
    if (visibleSlots.includes(slot)) {
      if (visibleSlots.length === 1) return
      dispatch(setVisibleSlots(visibleSlots.filter((s) => s !== slot)))
    } else {
      dispatch(
        setVisibleSlots(MEAL_SLOT_ORDER.filter((s) => [...visibleSlots, slot].includes(s))),
      )
    }
  }

  // ── Quota display ──────────────────────────────────────────────────────────
  const quota = appSettings?.aiImageRequestsPerUser ?? 10
  const used = user?.aiImageRequestsUsed ?? 0
  const remaining = Math.max(0, quota - used)

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      {user && (
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">{t('profile.title')}</h2>

          <div className="settings-page__field">
            <label className="settings-page__label">{t('profile.changeUsername')}</label>
            <div className="settings-page__input-row">
              <Input
                id="settings-username"
                label={null}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Button
                onClick={handleSaveUsername}
                disabled={authStatus === 'loading' || newUsername === user.username}
              >
                {t('profile.save')}
              </Button>
            </div>
          </div>

          <div className="settings-page__field">
            <label className="settings-page__label">{t('profile.changeEmail')}</label>
            <div className="settings-page__input-row">
              <Input
                id="settings-email"
                label={null}
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailSent(false) }}
              />
              <Button
                onClick={handleSaveEmail}
                disabled={authStatus === 'loading' || newEmail === user.email}
              >
                {t('profile.save')}
              </Button>
            </div>
            {emailSent && <p className="settings-page__hint">{t('profile.emailConfirmationSent')}</p>}
          </div>

          <div className="settings-page__field">
            <label className="settings-page__label">{t('profile.changePassword')}</label>
            <div className="settings-page__input-row">
              <Input
                id="settings-password"
                label={null}
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordSaved(false) }}
                placeholder="••••••••"
              />
              <Button
                onClick={handleSavePassword}
                disabled={authStatus === 'loading' || newPassword.length < 6}
              >
                {t('profile.save')}
              </Button>
            </div>
            {passwordSaved && <p className="settings-page__hint">{t('profile.passwordSaved')}</p>}
          </div>

          <div className="settings-page__field">
            <label className="settings-page__label">{t('profile.aiRequestsRemaining')}</label>
            <p className="settings-page__static-value">
              {remaining} / {quota}
            </p>
          </div>

          {authError && <p className="settings-page__error">{authError}</p>}
        </section>
      )}

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
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

      {/* ── Meal Planner ────────────────────────────────────────────────────── */}
      <section className="settings-page__section">
        <h2 className="settings-page__section-title">{t('settings.mealPlanner')}</h2>

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

      {/* ── Admin ───────────────────────────────────────────────────────────── */}
      {user?.role === 'admin' && appSettings && (
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">{t('admin.title')}</h2>

          {/* Max users */}
          <div className="settings-page__field">
            <label className="settings-page__label">{t('admin.maxUsers')}</label>
            <div className="settings-page__input-row">
              <Input
                id="admin-max-users"
                label={null}
                type="number"
                value={appSettings.maxUsers ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  dispatch(updateAppSettings({ maxUsers: val }))
                }}
                placeholder={t('admin.unlimitedUsers')}
              />
            </div>
          </div>

          {/* AI image requests per user */}
          <div className="settings-page__field">
            <label className="settings-page__label">{t('admin.aiImageRequestsPerUser')}</label>
            <div className="settings-page__input-row">
              <Input
                id="admin-ai-quota"
                label={null}
                type="number"
                value={appSettings.aiImageRequestsPerUser}
                onChange={(e) =>
                  dispatch(updateAppSettings({ aiImageRequestsPerUser: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Require invite code */}
          <div className="settings-page__field">
            <label
              className="settings-page__toggle-label"
              htmlFor="admin-require-invite"
            >
              <span>{t('admin.requireInviteCode')}</span>
              <button
                id="admin-require-invite"
                type="button"
                role="switch"
                aria-checked={appSettings.requireInviteCode}
                className={`settings-page__toggle${appSettings.requireInviteCode ? ' settings-page__toggle--on' : ''}`}
                onClick={() =>
                  dispatch(
                    updateAppSettings({ requireInviteCode: !appSettings.requireInviteCode }),
                  )
                }
              >
                <span className="settings-page__toggle-knob" />
              </button>
            </label>
          </div>

          {/* Invite codes */}
          <div className="settings-page__field">
            <div className="settings-page__label-row">
              <label className="settings-page__label">{t('admin.inviteCodes')}</label>
              <Button onClick={() => dispatch(createInviteCode())} variant="secondary">
                {t('admin.generateCode')}
              </Button>
            </div>
            {inviteCodes.length > 0 && (
              <ul className="settings-page__code-list">
                {inviteCodes.map((c) => (
                  <li
                    key={c.id}
                    className={`settings-page__code-item${c.usedBy ? ' settings-page__code-item--used' : ''}`}
                  >
                    <code className="settings-page__code">{c.code}</code>
                    {c.usedBy && (
                      <span className="settings-page__code-used">{t('admin.codeUsed')}</span>
                    )}
                    <button
                      type="button"
                      className="settings-page__code-copy"
                      title="Copy"
                      onClick={() => navigator.clipboard.writeText(c.code)}
                    >
                      <Copy size={14} aria-hidden />
                    </button>
                    {!c.usedBy && (
                      <button
                        type="button"
                        className="settings-page__code-revoke"
                        title={t('admin.revokeCode')}
                        onClick={() => dispatch(revokeInviteCode(c.id))}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Users table */}
          <div className="settings-page__field">
            <label className="settings-page__label">{t('admin.users')}</label>
            {users.length > 0 && (
              <div className="settings-page__users">
                {users.map((u) => (
                  <div key={u.id} className="settings-page__user-row">
                    <span className="settings-page__user-name">{u.username}</span>
                    <select
                      className="settings-page__role-select"
                      value={u.role}
                      disabled={u.id === user.id}
                      onChange={(e) =>
                        dispatch(
                          updateUserRole({
                            userId: u.id,
                            role: e.target.value as 'admin' | 'user',
                          }),
                        )
                      }
                    >
                      <option value="user">{t('admin.roleUser')}</option>
                      <option value="admin">{t('admin.roleAdmin')}</option>
                    </select>
                    <span className="settings-page__ai-used">
                      {u.aiImageRequestsUsed} AI scans
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
