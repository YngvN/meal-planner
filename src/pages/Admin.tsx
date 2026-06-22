import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Switch, Pressable } from 'react-native'
import { Copy, LoaderCircle, TriangleAlert, X } from 'lucide-react-native'
import { Alert, Button, Checkbox, Input, TranslatedText } from '../components'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useLanguage } from '../i18n'
import {
  createInviteCode,
  fetchAppSettings,
  fetchInviteCodes,
  fetchUsers,
  revokeInviteCode,
  updateAppSettings,
  updateUserRole,
} from '../features/settings/adminSlice'
import { updateProduct } from '../features/ingredients/ingredientsSlice'
import { updateIngredient } from '../features/ingredients/ingredientsSlice'
import { aiReviewPrice, standardizeProducts, type ProductSuggestion } from '../features/ai/aiApi'
import { fetchAllPriceReports, updatePriceReportStatus } from '../features/ingredients/productsApi'
import type { PriceReport } from '../features/ingredients/types'
import type { IngredientCategory } from '../features/ingredients/types'
import { Select } from '../components'

/**
 * Admin-only page for managing app settings, invite codes, users,
 * and viewing AI usage statistics.
 */
export function Admin() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const currentUser = useAppSelector((s) => s.auth.user)
  const { appSettings, inviteCodes, users } = useAppSelector((s) => s.admin)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  // Price moderation state
  const [priceReports, setPriceReports] = useState<PriceReport[]>([])
  const [priceReportsLoaded, setPriceReportsLoaded] = useState(false)
  const [priceReviewLoading, setPriceReviewLoading] = useState<Set<string>>(new Set())
  const [priceReviewMsg, setPriceReviewMsg] = useState<Record<string, string>>({})

  // Product standardization state
  const [standardizing, setStandardizing] = useState(false)
  const [standardizeError, setStandardizeError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    dispatch(fetchAppSettings())
    dispatch(fetchInviteCodes())
    dispatch(fetchUsers())
  }, [dispatch])

  if (!appSettings) return null

  const quota = appSettings.aiImageRequestsPerUser
  const totalScans = users.reduce((sum, u) => sum + u.aiImageRequestsUsed, 0)

  async function loadPriceReports() {
    setPriceReportsLoaded(false)
    const reports = await fetchAllPriceReports('pending_review')
    setPriceReports(reports)
    setPriceReportsLoaded(true)
  }

  async function handlePriceAction(reportId: string, action: 'approve' | 'reject' | 'ai') {
    setPriceReviewLoading((prev) => new Set(prev).add(reportId))
    try {
      if (action === 'ai') {
        const { status, verdict } = await aiReviewPrice(reportId)
        setPriceReviewMsg((prev) => ({ ...prev, [reportId]: `AI: ${status} — ${verdict}` }))
      } else {
        await updatePriceReportStatus(reportId, action === 'approve' ? 'approved' : 'rejected')
      }
      setPriceReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (err) {
      setPriceReviewMsg((prev) => ({ ...prev, [reportId]: err instanceof Error ? err.message : t('common.error') }))
    } finally {
      setPriceReviewLoading((prev) => { const s = new Set(prev); s.delete(reportId); return s })
    }
  }

  async function handleStandardize() {
    setStandardizing(true)
    setStandardizeError(null)
    setSuggestions([])
    setExcluded(new Set())
    try {
      const productInputs = ingredients.flatMap((ing) =>
        (ing.products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          ingredientName: ing.name,
          currentCategory: ing.category,
        })),
      )
      if (!productInputs.length) {
        setStandardizeError(t('admin.standardize.noProducts'))
        return
      }
      const result = await standardizeProducts(productInputs)
      setSuggestions(result)
    } catch (err) {
      setStandardizeError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setStandardizing(false)
    }
  }

  async function handleApply() {
    setApplying(true)
    try {
      const toApply = suggestions.filter((s) => !excluded.has(s.productId))
      for (const s of toApply) {
        const ing = ingredients.find((i) => i.products?.some((p) => p.id === s.productId))
        if (!ing) continue
        await dispatch(updateProduct({ id: s.productId, payload: { tags: s.tags } })).unwrap()
        if (s.suggestedCategory && s.suggestedCategory !== ing.category) {
          await dispatch(updateIngredient({ id: ing.id, payload: { category: s.suggestedCategory as IngredientCategory } })).unwrap()
        }
      }
      setSuggestions([])
    } catch (err) {
      setStandardizeError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setApplying(false)
    }
  }

  const roleOptions = [
    { value: 'user', label: t('admin.roleUser') },
    { value: 'admin', label: t('admin.roleAdmin') },
  ]

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="p-4 gap-6">
        <Text className="text-2xl font-bold text-app-text dark:text-text-dark">
          <TranslatedText id="admin.title" />
        </Text>

        {/* ── App settings ──────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
            <TranslatedText id="admin.appSettings" />
          </Text>

          <Input
            label={t('admin.maxUsers')}
            value={appSettings.maxUsers != null ? String(appSettings.maxUsers) : ''}
            onChangeText={(v) => {
              const val = v === '' ? null : Number(v)
              dispatch(updateAppSettings({ maxUsers: val }))
            }}
            keyboardType="numeric"
            placeholder={t('admin.unlimitedUsers')}
          />

          <Input
            label={t('admin.aiImageRequestsPerUser')}
            value={String(appSettings.aiImageRequestsPerUser)}
            onChangeText={(v) => dispatch(updateAppSettings({ aiImageRequestsPerUser: Number(v) }))}
            keyboardType="numeric"
          />

          <View className="flex-row items-center justify-between">
            <Text className="text-base text-app-text dark:text-text-dark">
              <TranslatedText id="admin.requireInviteCode" />
            </Text>
            <Switch
              value={appSettings.requireInviteCode}
              onValueChange={(v) => dispatch(updateAppSettings({ requireInviteCode: v }))}
            />
          </View>
        </View>

        {/* ── Invite codes ──────────────────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
              <TranslatedText id="admin.inviteCodes" />
            </Text>
            <Button variant="secondary" onPress={() => dispatch(createInviteCode())}>
              <TranslatedText id="admin.generateCode" />
            </Button>
          </View>

          {inviteCodes.map((c) => (
            <View key={c.id} className={`flex-row items-center gap-2 bg-surface dark:bg-surface-dark rounded-lg p-3 ${c.usedBy ? 'opacity-50' : ''}`}>
              <Text className="flex-1 font-mono text-sm text-app-text dark:text-text-dark">{c.code}</Text>
              {c.usedBy && (
                <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                  <TranslatedText id="admin.codeUsed" />
                </Text>
              )}
              <Pressable onPress={() => {}} className="p-1 active:opacity-70">
                <Copy size={14} />
              </Pressable>
              {!c.usedBy && (
                <Pressable onPress={() => dispatch(revokeInviteCode(c.id))} className="p-1 active:opacity-70">
                  <X size={14} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* ── AI usage statistics ───────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
            <TranslatedText id="admin.aiUsage" />
          </Text>

          {users.map((u) => {
            const pct = quota > 0 ? Math.round((u.aiImageRequestsUsed / quota) * 100) : 0
            const over = pct > 100
            return (
              <View key={u.id} className="bg-surface dark:bg-surface-dark rounded-lg p-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-app-text dark:text-text-dark">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <Text className="text-text-muted dark:text-text-muted-dark"> (you)</Text>
                    )}
                  </Text>
                  <Text className={`text-sm ${over ? 'text-error dark:text-error-dark' : 'text-text-muted dark:text-text-muted-dark'}`}>
                    {u.aiImageRequestsUsed} / {quota}
                  </Text>
                </View>
                <Select
                  value={u.role}
                  options={roleOptions}
                  onChange={(v) => dispatch(updateUserRole({ userId: u.id, role: v as 'admin' | 'user' }))}
                  disabled={u.id === currentUser?.id}
                />
                {/* Progress bar */}
                <View className="h-2 bg-border dark:bg-border-dark rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${over ? 'bg-error' : 'bg-accent dark:bg-accent-dark'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </View>
              </View>
            )
          })}

          {users.length > 0 && (
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="admin.totalUsers" vars={{ n: users.length }} /> · {totalScans} total scans
            </Text>
          )}
        </View>

        {/* ─── Price Report Moderation ─────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
              <TranslatedText id="admin.priceReports.title" />
            </Text>
            <Button variant="secondary" onPress={loadPriceReports}>
              <TranslatedText id="admin.priceReports.load" />
            </Button>
          </View>
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="admin.priceReports.hint" />
          </Text>

          {priceReportsLoaded && priceReports.length === 0 && (
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="admin.priceReports.empty" />
            </Text>
          )}

          {priceReports.map((report) => (
            <View key={report.id} className="bg-surface dark:bg-surface-dark rounded-lg p-3 gap-2">
              <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                <Text className="font-semibold text-app-text dark:text-text-dark">{report.storeName}</Text>
                <Text className="text-app-text dark:text-text-dark">{report.price} {report.currency}</Text>
                <Text className="font-mono text-xs text-text-muted dark:text-text-muted-dark">{report.productId}</Text>
              </View>
              {priceReviewMsg[report.id] && (
                <Text className="text-xs text-info dark:text-info-dark">{priceReviewMsg[report.id]}</Text>
              )}
              <View className="flex-row gap-2">
                <Button variant="secondary" disabled={priceReviewLoading.has(report.id)} onPress={() => handlePriceAction(report.id, 'approve')}>
                  <TranslatedText id="admin.priceReports.approve" />
                </Button>
                <Button variant="secondary" disabled={priceReviewLoading.has(report.id)} onPress={() => handlePriceAction(report.id, 'reject')}>
                  <TranslatedText id="admin.priceReports.reject" />
                </Button>
                <Button disabled={priceReviewLoading.has(report.id)} onPress={() => handlePriceAction(report.id, 'ai')}>
                  <TranslatedText id="admin.priceReports.aiReview" />
                </Button>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Product Standardization ─────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
              <TranslatedText id="admin.standardize.title" />
            </Text>
            <Button onPress={handleStandardize} disabled={standardizing || applying}>
              {standardizing
                ? <TranslatedText id="admin.standardize.running" />
                : <TranslatedText id="admin.standardize.run" />}
            </Button>
          </View>
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="admin.standardize.hint" />
          </Text>

          {standardizeError && (
            <Alert variant="error">{standardizeError}</Alert>
          )}

          {suggestions.length > 0 && (
            <View className="gap-3">
              {suggestions.map((s) => {
                const ing = ingredients.find((i) => i.products?.some((p) => p.id === s.productId))
                const product = ing?.products?.find((p) => p.id === s.productId)
                return (
                  <View key={s.productId} className="bg-surface dark:bg-surface-dark rounded-lg p-3 gap-2">
                    <Text className="font-medium text-app-text dark:text-text-dark">
                      {product?.name ?? s.productId}
                      {product?.brand ? ` — ${product.brand}` : ''}
                    </Text>
                    <Text className="text-sm text-text-muted dark:text-text-muted-dark">{s.tags.join(', ')}</Text>
                    {s.suggestedCategory && (
                      <Text className="text-sm text-text-muted dark:text-text-muted-dark">{ing?.category} → {s.suggestedCategory}</Text>
                    )}
                    <Checkbox
                      label={t('admin.standardize.include')}
                      checked={!excluded.has(s.productId)}
                      onChange={() => setExcluded((prev) => {
                        const next = new Set(prev)
                        next.has(s.productId) ? next.delete(s.productId) : next.add(s.productId)
                        return next
                      })}
                    />
                  </View>
                )
              })}
              <View className="flex-row gap-2">
                <Button variant="secondary" onPress={() => setSuggestions([])}>
                  <TranslatedText id="common.cancel" />
                </Button>
                <Button onPress={handleApply} disabled={applying || excluded.size === suggestions.length}>
                  <TranslatedText id="admin.standardize.apply" vars={{ n: suggestions.length - excluded.size }} />
                </Button>
              </View>
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  )
}
