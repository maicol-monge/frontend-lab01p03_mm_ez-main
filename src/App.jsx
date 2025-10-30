import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import EmpleadosList from './pages/EmpleadosList'
import EmpleadoForm from './pages/EmpleadoForm'
import EmpleadoDetalle from './pages/EmpleadoDetalle'
import Estadisticas from './pages/Estadisticas'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="pt-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/empleados" element={<EmpleadosList />} />
          <Route path="/empleados/:id" element={<EmpleadoDetalle />} />
          <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
          <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  )
}

export default App
