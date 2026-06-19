import { useEffect, useState } from 'react'
import { Copy, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { Button, TranslatedText } from '../components'
import { useAppDispatch, useAppSelector } from '../app/hooks'
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
import { standardizeProducts, type ProductSuggestion } from '../features/ai/aiApi'
import { Input } from '../components'
import type { IngredientCategory } from '../features/ingredients/types'
import './Admin.scss'

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
        // Find which ingredient owns this product
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

  return (
    <div className="admin-page">
      <h1><TranslatedText id="admin.title" /></h1>

      {/* ── App settings ──────────────────────────────────────────────────── */}
      <section className="admin-page__section">
        <h2 className="admin-page__section-title"><TranslatedText id="admin.appSettings" /></h2>

        <div className="admin-page__field">
          <label className="admin-page__label" htmlFor="admin-max-users">
            <TranslatedText id="admin.maxUsers" />
          </label>
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

        <div className="admin-page__field">
          <label className="admin-page__label" htmlFor="admin-ai-quota">
            <TranslatedText id="admin.aiImageRequestsPerUser" />
          </label>
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

        <label className="admin-page__toggle-row" htmlFor="admin-require-invite">
          <span><TranslatedText id="admin.requireInviteCode" /></span>
          <button
            id="admin-require-invite"
            type="button"
            role="switch"
            aria-checked={appSettings.requireInviteCode}
            className={`admin-page__toggle${appSettings.requireInviteCode ? ' admin-page__toggle--on' : ''}`}
            onClick={() =>
              dispatch(updateAppSettings({ requireInviteCode: !appSettings.requireInviteCode }))
            }
          >
            <span className="admin-page__toggle-knob" />
          </button>
        </label>
      </section>

      {/* ── Invite codes ──────────────────────────────────────────────────── */}
      <section className="admin-page__section">
        <div className="admin-page__section-header">
          <h2 className="admin-page__section-title"><TranslatedText id="admin.inviteCodes" /></h2>
          <Button variant="secondary" onClick={() => dispatch(createInviteCode())}>
            <TranslatedText id="admin.generateCode" />
          </Button>
        </div>

        {inviteCodes.length > 0 && (
          <ul className="admin-page__code-list">
            {inviteCodes.map((c) => (
              <li key={c.id} className={`admin-page__code-item${c.usedBy ? ' admin-page__code-item--used' : ''}`}>
                <code className="admin-page__code">{c.code}</code>
                {c.usedBy && <span className="admin-page__code-used"><TranslatedText id="admin.codeUsed" /></span>}
                <button
                  type="button"
                  className="admin-page__icon-btn"
                  title="Copy"
                  onClick={() => navigator.clipboard.writeText(c.code)}
                >
                  <Copy size={14} aria-hidden />
                </button>
                {!c.usedBy && (
                  <button
                    type="button"
                    className="admin-page__icon-btn"
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
      </section>

      {/* ── AI usage statistics ───────────────────────────────────────────── */}
      <section className="admin-page__section">
        <h2 className="admin-page__section-title"><TranslatedText id="admin.aiUsage" /></h2>

        {users.length > 0 && (
          <div className="admin-page__ai-table">
            <div className="admin-page__ai-row admin-page__ai-row--header">
              <span><TranslatedText id="admin.users" /></span>
              <span><TranslatedText id="admin.role" /></span>
              <span><TranslatedText id="admin.scansUsed" /></span>
              <span><TranslatedText id="admin.aiUsageBar" /></span>
            </div>

            {users.map((u) => {
              const pct = quota > 0 ? Math.round((u.aiImageRequestsUsed / quota) * 100) : 0
              const over = pct > 100
              return (
                <div key={u.id} className="admin-page__ai-row">
                  <span className="admin-page__ai-username">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="admin-page__ai-you"> (you)</span>
                    )}
                  </span>
                  <select
                    className="admin-page__role-select"
                    value={u.role}
                    disabled={u.id === currentUser?.id}
                    onChange={(e) =>
                      dispatch(updateUserRole({ userId: u.id, role: e.target.value as 'admin' | 'user' }))
                    }
                  >
                    <option value="user">{t('admin.roleUser')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                  </select>
                  <span className={`admin-page__ai-count${over ? ' admin-page__ai-count--over' : ''}`}>
                    {u.aiImageRequestsUsed} / {quota}
                    {over && <TriangleAlert size={13} aria-hidden />}
                  </span>
                  <div className="admin-page__ai-bar-wrap">
                    <div
                      className={`admin-page__ai-bar${over ? ' admin-page__ai-bar--over' : ''}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    <span className="admin-page__ai-pct">{pct}%</span>
                  </div>
                </div>
              )
            })}

            <div className="admin-page__ai-row admin-page__ai-row--total">
              <span><TranslatedText id="admin.totalUsers" vars={{ n: users.length }} /></span>
              <span />
              <span>{totalScans} total</span>
              <span />
            </div>
          </div>
        )}
      </section>

      {/* ─── Product Standardization ─────────────────────────────────────── */}
      <section className="admin-page__section">
        <div className="admin-page__section-header">
          <h2 className="admin-page__section-title"><TranslatedText id="admin.standardize.title" /></h2>
          <Button onClick={handleStandardize} disabled={standardizing || applying}>
            {standardizing
              ? <><LoaderCircle size={15} className="icon-spin" aria-hidden /> <TranslatedText id="admin.standardize.running" /></>
              : <TranslatedText id="admin.standardize.run" />}
          </Button>
        </div>
        <p className="admin-page__hint"><TranslatedText id="admin.standardize.hint" /></p>

        {standardizeError && (
          <p className="admin-page__error">{standardizeError}</p>
        )}

        {suggestions.length > 0 && (
          <>
            <div className="admin-page__standardize-table">
              <div className="admin-page__standardize-header">
                <span><TranslatedText id="admin.standardize.product" /></span>
                <span><TranslatedText id="admin.standardize.tags" /></span>
                <span><TranslatedText id="admin.standardize.category" /></span>
                <span><TranslatedText id="admin.standardize.include" /></span>
              </div>
              {suggestions.map((s) => {
                const ing = ingredients.find((i) => i.products?.some((p) => p.id === s.productId))
                const product = ing?.products?.find((p) => p.id === s.productId)
                return (
                  <div key={s.productId} className="admin-page__standardize-row">
                    <span>{product?.name ?? s.productId}{product?.brand && <em> — {product.brand}</em>}</span>
                    <span>{s.tags.join(', ')}</span>
                    <span>{s.suggestedCategory ? `${ing?.category} → ${s.suggestedCategory}` : '—'}</span>
                    <input
                      type="checkbox"
                      checked={!excluded.has(s.productId)}
                      onChange={() => setExcluded((prev) => {
                        const next = new Set(prev)
                        next.has(s.productId) ? next.delete(s.productId) : next.add(s.productId)
                        return next
                      })}
                    />
                  </div>
                )
              })}
            </div>
            <div className="admin-page__standardize-actions">
              <Button variant="secondary" onClick={() => setSuggestions([])}>
                <TranslatedText id="common.cancel" />
              </Button>
              <Button onClick={handleApply} disabled={applying || excluded.size === suggestions.length}>
                {applying
                  ? <><LoaderCircle size={15} className="icon-spin" aria-hidden /> <TranslatedText id="common.save" /></>
                  : <TranslatedText id="admin.standardize.apply" vars={{ n: suggestions.length - excluded.size }} />}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
