import { useEffect } from 'react'
import { Copy, TriangleAlert, X } from 'lucide-react'
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
import { Input } from '../components'
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

  useEffect(() => {
    dispatch(fetchAppSettings())
    dispatch(fetchInviteCodes())
    dispatch(fetchUsers())
  }, [dispatch])

  if (!appSettings) return null

  const quota = appSettings.aiImageRequestsPerUser
  const totalScans = users.reduce((sum, u) => sum + u.aiImageRequestsUsed, 0)

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
    </div>
  )
}
