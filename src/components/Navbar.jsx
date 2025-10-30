import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const isActive = (p) => (pathname === p ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/5')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('site-dark')
      const initial = saved === '1' || document.documentElement.classList.contains('dark')
      setDark(Boolean(initial))
      if (initial) document.documentElement.classList.add('dark')
    } catch (e) {
      // ignore
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    try {
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('site-dark', '1')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('site-dark', '0')
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-600 shadow">
      <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-white font-semibold text-lg md:text-xl truncate">TecnoGlobal</Link>

          <nav className="hidden md:flex gap-2 items-center">
            <Link to="/" className={`px-2 md:px-3 py-2 rounded-md text-sm md:text-base ${isActive('/')}`}>Home</Link>
            <Link to="/empleados" className={`px-2 md:px-3 py-2 rounded-md text-sm md:text-base ${isActive('/empleados')}`}>Empleados</Link>
            <Link to="/empleados/nuevo" className={`px-2 md:px-3 py-2 rounded-md text-sm md:text-base ${isActive('/empleados/nuevo')}`}>Nuevo</Link>
            <Link to="/estadisticas" className={`px-2 md:px-3 py-2 rounded-md text-sm md:text-base ${isActive('/estadisticas')}`}>Estadísticas</Link>
          </nav>

          <div className="md:hidden">
            <button
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
              className="p-2 rounded-md inline-flex items-center justify-center text-white hover:bg-white/5"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={toggleDark} aria-label="Toggle dark mode" className="p-2 rounded-md text-white hover:bg-white/5">
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8 8 0 1010.586 10.586z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.22a1 1 0 011.415 0l.707.707a1 1 0 11-1.414 1.414l-.708-.707a1 1 0 010-1.414zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM6.343 4.929a1 1 0 010 1.414L5.636 7.05A1 1 0 114.222 5.636l.707-.707a1 1 0 011.414 0zM4 9a1 1 0 110 2H3a1 1 0 110-2h1zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM15.657 14.95a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.343 14.95a1 1 0 011.414 0l.707.707A1 1 0 116.343 17.07l-.707-.707a1 1 0 010-1.414z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="md:hidden bg-brand-600/95">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link to="/" onClick={() => setOpen(false)} className={`block px-3 py-2 rounded ${isActive('/')}`}>Home</Link>
            <Link to="/empleados" onClick={() => setOpen(false)} className={`block px-3 py-2 rounded ${isActive('/empleados')}`}>Empleados</Link>
            <Link to="/empleados/nuevo" onClick={() => setOpen(false)} className={`block px-3 py-2 rounded ${isActive('/empleados/nuevo')}`}>Nuevo</Link>
            <Link to="/estadisticas" onClick={() => setOpen(false)} className={`block px-3 py-2 rounded ${isActive('/estadisticas')}`}>Estadísticas</Link>
          </div>
        </div>
      )}
    </header>
  )
}
