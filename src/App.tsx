import { NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher, ThemeToggle, TranslatedText } from './components'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <nav className="app__nav">
          <NavLink to="/" end>
            <TranslatedText id="nav.home" />
          </NavLink>
          <NavLink to="/recipes">
            <TranslatedText id="nav.recipes" />
          </NavLink>
          <NavLink to="/ingredients">
            <TranslatedText id="nav.ingredients" />
          </NavLink>
          <NavLink to="/pantry">
            <TranslatedText id="nav.pantry" />
          </NavLink>
        </nav>
        <div className="app__actions">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="app__content">
        <Outlet />
      </main>
    </div>
  )
}

export default App
