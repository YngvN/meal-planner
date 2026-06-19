import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Carrot,
  House,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'
import { TranslatedText } from './components'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { logoutUser } from './features/auth/authSlice'

/** A single navigation entry: route, translation key, and its icon. */
interface NavItem {
  to: string
  end?: boolean
  labelId: string
  Icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', end: true, labelId: 'nav.home', Icon: House },
  { to: '/recipes', labelId: 'nav.recipes', Icon: BookOpen },
  { to: '/ingredients', labelId: 'nav.ingredients', Icon: Carrot },
  { to: '/pantry', labelId: 'nav.pantry', Icon: Package },
  { to: '/meal-plan', labelId: 'nav.mealPlan', Icon: CalendarDays },
  { to: '/shopping-list', labelId: 'nav.shoppingList', Icon: ShoppingCart },
  { to: '/settings', labelId: 'nav.settings', Icon: Settings },
]

/**
 * App shell. Navigation lives in a left sidebar that is persistent on larger
 * screens and collapses behind a hamburger dropdown on phones.
 */
function App() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [navOpen, setNavOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  async function handleSignOut() {
    setNavOpen(false)
    await dispatch(logoutUser())
    navigate('/login', { replace: true })
  }

  // Close the mobile dropdown on Escape or click outside.
  useEffect(() => {
    if (!navOpen) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        sidebarRef.current?.contains(target) ||
        hamburgerRef.current?.contains(target)
      ) {
        return
      }
      setNavOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [navOpen])

  return (
    <div className="app">
      <aside
        ref={sidebarRef}
        className={`app__sidebar${navOpen ? ' app__sidebar--open' : ''}`}
      >
        <h1 className="app__brand">
          <TranslatedText id="nav.appName" />
        </h1>
        <nav className="app__nav">
          {NAV_ITEMS.map(({ to, end, labelId, Icon }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setNavOpen(false)}>
              <Icon size={20} aria-hidden />
              <TranslatedText id={labelId} />
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" onClick={() => setNavOpen(false)}>
              <ShieldCheck size={20} aria-hidden />
              <TranslatedText id="nav.admin" />
            </NavLink>
          )}
        </nav>

        <div className="app__sidebar-footer">
          {user && (
            <span className="app__sidebar-username" title={user.email}>
              {user.username}
            </span>
          )}
          <button type="button" className="app__signout" onClick={handleSignOut}>
            <LogOut size={18} aria-hidden />
            <TranslatedText id="auth.signOut" />
          </button>
        </div>
      </aside>

      <div className="app__main">
        <header className="app__topbar">
          <button
            ref={hamburgerRef}
            type="button"
            className="app__hamburger"
            aria-label="Menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <Menu size={22} aria-hidden />
          </button>
          <span className="app__brand-mobile">
            <TranslatedText id="nav.appName" />
          </span>
        </header>

        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
