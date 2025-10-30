import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function safeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function Estadisticas() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await api.estadisticas()
        setStats(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Derive missing stats when possible
  const derived = useMemo(() => {
    if (!stats) return null
    // normalize backend field names to a canonical shape used in the UI
    const out = { ...stats }
    // backend: empleadosActivos / empleadosInactivos -> map to activos/inactivos
    if (out.empleadosActivos != null && out.activos == null) out.activos = out.empleadosActivos
    if (out.empleadosInactivos != null && out.inactivos == null) out.inactivos = out.empleadosInactivos
    // backend: promedioSalario (BigDecimal) -> promedioSalarios (string/number)
    if (out.promedioSalario != null && out.promedioSalarios == null) {
      // keep two decimals
      const n = safeNumber(out.promedioSalario)
      out.promedioSalarios = n != null ? Number(n).toFixed(2) : String(out.promedioSalario)
    }

    // empleadosPorPuesto: object mapping puesto->count
    if (!out.empleadosPorPuesto) {
      // maybe backend returns list of empleados
      if (out.empleados && Array.isArray(out.empleados)) {
        out.empleadosPorPuesto = out.empleados.reduce((acc, e) => {
          const p = e.puesto || 'Desconocido'
          acc[p] = (acc[p] || 0) + 1
          return acc
        }, {})
      }
    }

    // total
    if (out.totalEmpleados == null) {
      if (out.total != null) out.totalEmpleados = out.total
      else if (out.empleados && Array.isArray(out.empleados)) out.totalEmpleados = out.empleados.length
      else if (out.empleadosPorPuesto) out.totalEmpleados = Object.values(out.empleadosPorPuesto).reduce((a,b) => a + b, 0)
    }

    // activos/inactivos
    if (out.activos == null || out.inactivos == null) {
      if (out.porEstado) {
        out.activos = out.porEstado.Activo ?? out.porEstado.ACTIVO ?? out.porEstado.activo
        out.inactivos = out.porEstado.Inactivo ?? out.porEstado.INACTIVO ?? out.porEstado.inactivo
      } else if (out.empleados && Array.isArray(out.empleados)) {
        out.activos = out.empleados.filter(e => String(e.estado).toLowerCase() === 'activo').length
        out.inactivos = out.empleados.filter(e => String(e.estado).toLowerCase() === 'inactivo').length
      }
    }

    // promedio salarial
    if (out.promedioSalarios == null) {
      if (out.salarios && Array.isArray(out.salarios) && out.salarios.length) {
        const nums = out.salarios.map(s => safeNumber(s)).filter(x => x != null)
        out.promedioSalarios = nums.length ? (nums.reduce((a,b) => a+b,0)/nums.length).toFixed(2) : null
      } else if (out.empleados && Array.isArray(out.empleados)) {
        const nums = out.empleados.map(e => safeNumber(e.salario)).filter(x => x != null)
        out.promedioSalarios = nums.length ? (nums.reduce((a,b) => a+b,0)/nums.length).toFixed(2) : null
      }
    }

    // promedio antiguedad (años) - backend field: promedioAntiguedadAnios
    if (out.promedioAntiguedadAnios != null && out.promedioAntiguedad == null) {
      const n = Number(out.promedioAntiguedadAnios)
      out.promedioAntiguedad = Number.isFinite(n) ? n : null
    }

    return out
  }, [stats])

  if (loading) return <div className="page-container">Cargando estadísticas...</div>
  if (error) return <div className="page-container"><div className="rounded bg-red-50 text-red-700 p-3">{error}</div></div>

  const s = derived
  if (!s) return <div className="container-fluid px-4 mt-4">No hay estadísticas</div>

  // prepare chart data
  const puestos = s.empleadosPorPuesto ? Object.keys(s.empleadosPorPuesto) : []
  const puestosCounts = s.empleadosPorPuesto ? Object.values(s.empleadosPorPuesto) : []

  const estadoLabels = ['Activo', 'Inactivo']
  const estadoValues = [s.activos ?? 0, s.inactivos ?? 0]

  const barData = {
    labels: puestos,
    datasets: [
      {
        label: 'Empleados por puesto',
        data: puestosCounts,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    ]
  }

  const pieData = {
    labels: estadoLabels,
    datasets: [
      {
        data: estadoValues,
        backgroundColor: ['#198754', '#dc3545']
      }
    ]
  }

  return (
    <div className="page-container">
      <h2 className="mb-6 text-center text-2xl font-semibold">Estadísticas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Total empleados</h5>
          <p className="text-2xl font-bold">{s.totalEmpleados ?? 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Activos</h5>
          <p className="text-2xl font-bold">{s.activos ?? 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Inactivos</h5>
          <p className="text-2xl font-bold">{s.inactivos ?? 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Promedio salarial</h5>
          <p className="text-2xl font-bold">{(function(){
            const v = s.promedioSalarios
            const n = Number(v)
            if (Number.isFinite(n)) return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n)
            if (v == null) return 'N/A'
            return String(v)
          })()}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Antigüedad promedio</h5>
          <p className="text-2xl font-bold">{(function(){
            const v = s.promedioAntiguedad
            const n = Number(v)
            return Number.isFinite(n) ? `${n.toFixed(1)} años` : 'N/A'
          })()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-surface">
          <h5 className="text-lg font-medium mb-3">Empleados por puesto</h5>
          {puestos.length ? <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p>No hay datos por puesto</p>}
        </div>
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Estado</h5>
          { (s.activos != null || s.inactivos != null) ? <Pie data={pieData} options={{ responsive: true }} /> : <p>No hay datos de estado</p> }
        </div>
      </div>
    </div>
  )
}
