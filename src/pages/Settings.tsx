import { useState } from 'react'
import { View, Text, ScrollView, Switch } from 'react-native'
import { Button, Checkbox, FilterChip, Input, LanguageSwitcher, ThemeToggle } from '../components'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchCurrentUser,
  updateUserEmail,
  updateUsername,
  updateUserPassword,
} from '../features/auth/authSlice'
import type { ScoringFactors } from '../features/settings/types'
import { setCountry, setPreferredCurrency, setVisibleSlots, toggleAutoSuggest, toggleScoringFactor } from '../features/settings/settingsSlice'
import { MEAL_SLOT_ORDER, type MealSlot } from '../features/mealPlan/types'
import { useLanguage } from '../i18n'

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
 * Settings page — profile, appearance, and meal planner preferences.
 * Admin controls live on the dedicated /admin page.
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
  const country = useAppSelector((s) => s.settings.country)
  const preferredCurrency = useAppSelector((s) => s.settings.preferredCurrency)
  const appSettings = useAppSelector((s) => s.admin.appSettings)

  // ── Profile form state ─────────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState(user?.username ?? '')
  const [newEmail, setNewEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

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
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="p-4 gap-6">

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        {user && (
          <View className="gap-4">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('profile.title')}</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('profile.changeUsername')}</Text>
              <View className="flex-row gap-2 items-end">
                <View className="flex-1">
                  <Input
                    label={undefined}
                    value={newUsername}
                    onChangeText={setNewUsername}
                  />
                </View>
                <Button
                  onPress={handleSaveUsername}
                  disabled={authStatus === 'loading' || newUsername === user.username}
                >
                  {t('profile.save')}
                </Button>
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('profile.changeEmail')}</Text>
              <View className="flex-row gap-2 items-end">
                <View className="flex-1">
                  <Input
                    label={undefined}
                    value={newEmail}
                    onChangeText={(v) => { setNewEmail(v); setEmailSent(false) }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <Button
                  onPress={handleSaveEmail}
                  disabled={authStatus === 'loading' || newEmail === user.email}
                >
                  {t('profile.save')}
                </Button>
              </View>
              {emailSent && <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('profile.emailConfirmationSent')}</Text>}
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('profile.changePassword')}</Text>
              <View className="flex-row gap-2 items-end">
                <View className="flex-1">
                  <Input
                    label={undefined}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setPasswordSaved(false) }}
                    secureTextEntry
                    placeholder="••••••••"
                  />
                </View>
                <Button
                  onPress={handleSavePassword}
                  disabled={authStatus === 'loading' || newPassword.length < 6}
                >
                  {t('profile.save')}
                </Button>
              </View>
              {passwordSaved && <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('profile.passwordSaved')}</Text>}
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('profile.aiRequestsRemaining')}</Text>
              <Text className="text-base text-app-text dark:text-text-dark">{remaining} / {quota}</Text>
            </View>

            {authError && <Text className="text-sm text-error dark:text-error-dark">{authError}</Text>}
          </View>
        )}

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('settings.appearance')}</Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-base text-app-text dark:text-text-dark">{t('settings.theme')}</Text>
            <ThemeToggle />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-base text-app-text dark:text-text-dark">{t('settings.language')}</Text>
            <LanguageSwitcher />
          </View>
        </View>

        {/* ── Meal Planner ────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('settings.mealPlanner')}</Text>

          <View className="gap-2">
            <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('settings.visibleSlots')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {MEAL_SLOT_ORDER.map((slot) => {
                const isLast = visibleSlots.length === 1 && visibleSlots.includes(slot)
                return (
                  <FilterChip
                    key={slot}
                    active={visibleSlots.includes(slot)}
                    onPress={isLast ? undefined : () => handleSlotToggle(slot)}
                  >
                    {t(`mealPlan.slot.${slot}`)}
                  </FilterChip>
                )
              })}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-base text-app-text dark:text-text-dark">{t('settings.autoSuggest')}</Text>
            <Switch
              value={autoSuggestEnabled}
              onValueChange={() => dispatch(toggleAutoSuggest())}
            />
          </View>

          {autoSuggestEnabled && (
            <View className="gap-2 pl-4">
              <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('settings.scoringFactors')}</Text>
              {SCORING_FACTOR_KEYS.map((key) => (
                <Checkbox
                  key={key}
                  label={t(`settings.factors.${key}`)}
                  checked={scoringFactors[key]}
                  onChange={() => dispatch(toggleScoringFactor(key))}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Regional ──────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('settings.regional')}</Text>
          <Input
            label={t('settings.country')}
            value={country}
            onChangeText={(v) => dispatch(setCountry(v))}
            placeholder="NO"
            autoCapitalize="characters"
          />
          <Input
            label={t('settings.preferredCurrency')}
            value={preferredCurrency}
            onChangeText={(v) => dispatch(setPreferredCurrency(v))}
            placeholder="NOK"
            autoCapitalize="characters"
          />
        </View>

      </View>
    </ScrollView>
  )
}
