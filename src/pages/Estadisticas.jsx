import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Bar, Pie, Line, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend, ArcElement)

function safeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default function Estadisticas() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employees, setEmployees] = useState([])
  const [chartsLoading, setChartsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await api.estadisticas()
        setStats(data)
      } catch (err) {
        // prefer structured body.message when available
        if (err && err.body && typeof err.body === 'object' && err.body.message) setError(String(err.body.message))
        else if (err && err.status === 404 && err.body) setError(String(err.body))
        else setError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // fetch employees to build scatter and time series charts and to compute totals
  // NOTE: we fetch a large page (per_page=1000) as a pragmatic client-side fallback
  // when the backend doesn't provide direct totals. Prefer a dedicated /estadisticas
  // endpoint on the server for large datasets or pagination-heavy apps.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setChartsLoading(true)
      try {
  // fetch many employees including inactivos so we can compute totals (activos/inactivos)
  const list = await api.list({ per_page: 1000, with_inactive: true })
        // api.list may return an array or paginated object; normalize to array
        const arr = Array.isArray(list) ? list : (Array.isArray(list.data) ? list.data : [])
        if (mounted) setEmployees(arr)
      } catch (e) {
        // ignore charts fetch errors (we'll still show aggregated stats)
        if (mounted) setEmployees([])
      } finally {
        if (mounted) setChartsLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Derive missing stats when possible
  const derived = useMemo(() => {
    if (!stats) return null
    // Map Laravel estadisticas payload to a friendly shape
    const out = { ...stats }
    // promedio_salario_por_departamento -> array of { departamento, promedio }
    out.promedio_por_departamento = Array.isArray(out.promedio_salario_por_departamento)
      ? out.promedio_salario_por_departamento.map(r => ({ departamento: r.departamento, promedio: safeNumber(r.promedio) }))
      : []

    out.total_bonificaciones = Number.isFinite(Number(out.total_bonificaciones_mensuales)) ? Number(out.total_bonificaciones_mensuales) : null
    out.total_descuentos = Number.isFinite(Number(out.total_descuentos_mensuales)) ? Number(out.total_descuentos_mensuales) : null
    out.crecimiento_neto_pct = out.crecimiento_salario_neto_pct ?? null
    out.edad_promedio = safeNumber(out.edad_promedio)

    // distribucion_sexo is expected as [{ sexo, total }, ...]
    out.distribucion_sexo_map = (Array.isArray(out.distribucion_sexo) ? out.distribucion_sexo : []).reduce((acc, r) => { acc[r.sexo] = r.total; return acc }, {})

    out.evaluacion_promedio_por_departamento = Array.isArray(out.evaluacion_promedio_por_departamento) ? out.evaluacion_promedio_por_departamento.map(r => ({ departamento: r.departamento, promedio: safeNumber(r.promedio) })) : []

    // Evolución del salario promedio por año (server-provided) -> [{ year, promedio }]
    out.evolucion_salario_promedio_por_anio = Array.isArray(out.evolucion_salario_promedio_por_anio)
      ? out.evolucion_salario_promedio_por_anio.map(r => ({ year: r.year, promedio: safeNumber(r.promedio) }))
      : (Array.isArray(out.evolucion_salario_promedio_por_anio) ? out.evolucion_salario_promedio_por_anio : [])

    // Promedio general del salario base entre todos los empleados activos
    out.promedio_salario_base_general = Number.isFinite(Number(out.promedio_salario_base_general)) ? Number(out.promedio_salario_base_general) : null

    out.edad_promedio_directivo = safeNumber(out.edad_promedio_directivo)
    out.edad_promedio_operativo = safeNumber(out.edad_promedio_operativo)
    out.correlacion_salario_desempeno = safeNumber(out.correlacion_salario_desempeno)
    out.antiguedad_promedio = safeNumber(out.antiguedad_promedio)
    out.correlacion_antiguedad_salario = safeNumber(out.correlacion_antiguedad_salario)
    out.tiempo_promedio_permanencia = safeNumber(out.tiempo_promedio_permanencia)

    out.empleados_con_eval_gt_95 = Array.isArray(out.empleados_con_eval_gt_95) ? out.empleados_con_eval_gt_95 : []
    out.personal_eval_gt_70 = Array.isArray(out.personal_eval_gt_70) ? out.personal_eval_gt_70 : []
    out.personal_mas_10 = Array.isArray(out.personal_mas_10_anos) ? out.personal_mas_10_anos : []

    return out
  }, [stats])

  // Reload handler to refresh stats and chart data on demand
  const reloadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.estadisticas()
      setStats(data)
    } catch (err) {
      if (err && err.body && typeof err.body === 'object' && err.body.message) setError(String(err.body.message))
      else if (err && err.status === 404 && err.body) setError(String(err.body))
      else setError(err.message || String(err))
    } finally {
      setLoading(false)
    }

    // refresh employees used for charts as well
    setChartsLoading(true)
    try {
      const list = await api.list({ per_page: 1000, with_inactive: true })
      const arr = Array.isArray(list) ? list : (Array.isArray(list.data) ? list.data : [])
      setEmployees(arr)
    } catch (e) {
      setEmployees([])
    } finally {
      setChartsLoading(false)
    }
  }

  if (loading) return <div className="page-container">Cargando estadísticas...</div>
  if (error) return <div className="page-container"><div className="rounded bg-red-50 text-red-700 p-3">{error}</div></div>

  const s = derived
  if (!s) return <div className="container-fluid px-4 mt-4">No hay estadísticas</div>

  // prepare chart data
  const puestos = s.promedio_por_departamento ? s.promedio_por_departamento.map(r => r.departamento) : []
  const puestosCounts = s.promedio_por_departamento ? s.promedio_por_departamento.map(r => r.promedio ?? 0) : []

  // Scatter: Desempeño vs Salario Base (from employees list)
  // Exclude salary base == 0 and ensure only active employees considered (we fetched estado:1 above)
  const scatterPoints = (employees || [])
    .filter(emp => emp && emp.salario_base != null && Number(emp.salario_base) > 0 && emp.evaluacion_desempeno != null)
    .map(emp => ({ x: Number(emp.salario_base) || 0, y: Number(emp.evaluacion_desempeno) || 0 }))

  // Line: Evolución salario promedio por año (from employees.updated_at and salario_neto)
  // Prefer server-provided series if available, otherwise derive from employees.updated_at
  const serverSeries = (s && Array.isArray(s.evolucion_salario_promedio_por_anio) && s.evolucion_salario_promedio_por_anio.length)
    ? s.evolucion_salario_promedio_por_anio.map(i => ({ year: i.year, avg: Number.isFinite(Number(i.promedio)) ? Number(i.promedio) : null }))
    : null

  const localSeries = (() => {
    const map = new Map();
    ;(employees || []).forEach(emp => {
      if (!emp || !emp.updated_at) return
      const d = new Date(emp.updated_at)
      if (isNaN(d.getTime())) return
      const y = d.getFullYear()
      const val = Number(emp.salario_neto)
      if (!Number.isFinite(val)) return
      if (!map.has(y)) map.set(y, { sum: 0, count: 0 })
      const cur = map.get(y)
      cur.sum += val
      cur.count += 1
      map.set(y, cur)
    })
    const items = Array.from(map.entries()).map(([year, v]) => ({ year, avg: v.count ? (v.sum / v.count) : null }))
    items.sort((a,b) => a.year - b.year)
    return items
  })()

  const seriesByYear = serverSeries && serverSeries.length ? serverSeries : localSeries

  const lineLabels = seriesByYear.map(i => String(i.year))
  // round year averages to 2 decimals
  const lineValues = seriesByYear.map(i => Number.isFinite(Number(i.avg)) ? Number(Number(i.avg).toFixed(2)) : 0)

  const estadoLabels = Object.keys(s.distribucion_sexo_map || {})
  const estadoValues = estadoLabels.map(k => s.distribucion_sexo_map[k] || 0)

  // compute totals: prefer server-provided totals when available in `stats`,
  // otherwise derive from the fetched `employees` array as a fallback.
  const totalFromStats = (s && (s.total_empleados || s.total || s.total_personal)) || null
  const activosFromStats = (s && (s.total_activos || s.activos || s.total_activos_mensuales)) || null
  const inactivosFromStats = (s && (s.total_inactivos || s.inactivos)) || null

  const totalEmployees = totalFromStats != null ? Number(totalFromStats) : (Array.isArray(employees) ? employees.length : 0)
  const activosCount = activosFromStats != null ? Number(activosFromStats) : (Array.isArray(employees) ? employees.filter(e => e && (e.estado === 1 || String(e.estado) === '1')).length : 0)
  const inactivosCount = inactivosFromStats != null ? Number(inactivosFromStats) : (Number.isFinite(Number(totalEmployees)) ? (Number(totalEmployees) - Number(activosCount)) : null)

  // totals for distribution percentages
  const totalDistribucion = estadoValues.reduce((a,b) => a + b, 0) || 0
  const distribucionPercent = estadoLabels.map(k => {
    const v = s.distribucion_sexo_map[k] || 0
    return totalDistribucion ? Math.round((v / totalDistribucion) * 100) : 0
  })

  // evaluation average overall (fallback to avg of per-department averages)
  const evalPromDept = Array.isArray(s.evaluacion_promedio_por_departamento) ? s.evaluacion_promedio_por_departamento : []
  const evalPromedioGlobal = (evalPromDept.length ? (evalPromDept.reduce((a,b) => a + (Number(b.promedio) || 0), 0) / evalPromDept.length) : null)

  // counts and percentages for evaluation thresholds
  const countEval95 = Array.isArray(s.empleados_con_eval_gt_95) ? s.empleados_con_eval_gt_95.length : 0
  const countEval70 = Array.isArray(s.personal_eval_gt_70) ? s.personal_eval_gt_70.length : 0
  // prefer actual active employees count (we fetched activos for charts)
  const activeEmployeesCount = Array.isArray(employees) ? employees.filter(e => e && (e.estado === 1 || String(e.estado) === '1')).length : 0
  const totalActive = activeEmployeesCount || totalDistribucion || employees.length || 0
  const pctEval70 = totalActive ? Math.round((countEval70 / totalActive) * 100) : null

  // personal mas 10
  const countMas10 = Array.isArray(s.personal_mas_10) ? s.personal_mas_10.length : 0
  const pctMas10 = totalActive ? Math.round((countMas10 / totalActive) * 100) : null

  const barData = {
    labels: puestos,
    datasets: [
      {
        label: 'Salario promedio ($)',
        data: puestosCounts,
        backgroundColor: puestos.map((_,i) => `hsl(${(i*60)%360} 70% 55% / 0.85)`)
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

  const scatterData = {
    datasets: [
      {
        label: 'Desempeño vs Salario Base',
        data: scatterPoints,
        backgroundColor: 'rgba(255,99,132,0.8)'
      }
    ]
  }

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Salario neto promedio',
        data: lineValues,
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)'
      }
    ]
  }

  // evaluation per department bar data
  const evalDept = Array.isArray(s.evaluacion_promedio_por_departamento) ? s.evaluacion_promedio_por_departamento : []
  const evalDeptLabels = evalDept.map(r => r.departamento)
  const evalDeptValues = evalDept.map(r => Number(r.promedio) || 0)
  const evalBarData = {
    labels: evalDeptLabels,
    datasets: [
      {
        label: 'Evaluación promedio',
        data: evalDeptValues,
        backgroundColor: evalDeptLabels.map((_,i) => `hsl(${(i*60)%360} 65% 50% / 0.85)`)
      }
    ]
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Estadísticas</h2>
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded border px-3 py-1 text-sm bg-white hover:bg-slate-50"
            onClick={reloadStats}
            disabled={loading || chartsLoading}
          >
            {loading || chartsLoading ? 'Recargando...' : 'Recargar estadísticas'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Total empleados</h5>
          <p className="text-2xl font-bold">{Number.isFinite(Number(totalEmployees)) ? String(totalEmployees) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Empleados activos</h5>
          <p className="text-2xl font-bold">{Number.isFinite(Number(activosCount)) ? String(activosCount) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Empleados inactivos</h5>
          <p className="text-2xl font-bold">{Number.isFinite(Number(inactivosCount)) ? String(inactivosCount) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Total bonificaciones (mensual)</h5>
          <p className="text-2xl font-bold">{s.total_bonificaciones != null ? new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(s.total_bonificaciones) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Total descuentos (mensual)</h5>
          <p className="text-2xl font-bold">{s.total_descuentos != null ? new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(s.total_descuentos) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Promedio salario base (general)</h5>
          <p className="text-2xl font-bold">{s.promedio_salario_base_general != null ? new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(s.promedio_salario_base_general) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Crecimiento salario neto (pct)</h5>
          <p className="text-2xl font-bold">{s.crecimiento_neto_pct != null ? `${Number(s.crecimiento_neto_pct).toFixed(2)}%` : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Edad promedio directivo</h5>
          <p className="text-2xl font-bold">{s.edad_promedio_directivo != null ? `${Number(s.edad_promedio_directivo).toFixed(1)} años` : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Edad promedio operativo</h5>
          <p className="text-2xl font-bold">{s.edad_promedio_operativo != null ? `${Number(s.edad_promedio_operativo).toFixed(1)} años` : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Edad promedio</h5>
          <p className="text-2xl font-bold">{s.edad_promedio != null ? `${Number(s.edad_promedio).toFixed(1)} años` : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Antigüedad promedio</h5>
          <p className="text-2xl font-bold">{s.antiguedad_promedio != null ? `${Number(s.antiguedad_promedio).toFixed(1)} años` : 'N/A'}</p>
        </div>
      </div>

      {/* Evaluación / desempeño summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Evaluación promedio</h5>
          <p className="text-2xl font-bold">{evalPromedioGlobal != null ? Number(evalPromedioGlobal).toFixed(1) : (s.evaluacion_promedio ? String(s.evaluacion_promedio) : 'N/A')}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Correlación salario-desempeño</h5>
          <p className="text-2xl font-bold">{s.correlacion_salario_desempeno != null ? Number(s.correlacion_salario_desempeno).toFixed(2) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Empleados con evaluación &gt; 95</h5>
          <p className="text-2xl font-bold">{countEval95}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Personal con evaluación &gt; 70</h5>
          <p className="text-2xl font-bold">{pctEval70 != null ? `${pctEval70}%` : (countEval70 !== null ? String(countEval70) : 'N/A')}</p>
        </div>
      </div>

      {/* Distribución por sexo resumida + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Salario promedio por departamento</h5>
          {puestos.length ? <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p>No hay datos por departamento</p>}
        </div>
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Desempeño vs Salario Base</h5>
          {chartsLoading ? <p>Cargando datos...</p> : (scatterPoints.length ? <Scatter data={scatterData} options={{ responsive: true, scales: { x: { title: { display: true, text: 'Salario base' } }, y: { title: { display: true, text: 'Evaluación' }, min: 0, max: 100 } } }} /> : <p>No hay suficientes datos para el scatter</p>)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Distribución por sexo</h5>
          { estadoLabels.length ? (
            <>
              <div className="mb-3">
                <strong>{estadoLabels.map((k,i) => `${k}: ${distribucionPercent[i] || 0}%`).join(' / ')}</strong>
              </div>
              <Pie data={pieData} options={{ responsive: true }} />
            </>
          ) : <p>No hay datos de sexo</p> }
        </div>
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Evolución salario neto promedio</h5>
          {chartsLoading ? <p>Cargando datos...</p> : (lineLabels.length ? <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p>No hay datos temporales suficientes</p>)}
        </div>
      </div>
      {/* optional lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Empleados con evaluación &gt; 95</h5>
          {Array.isArray(s.empleados_con_eval_gt_95) && s.empleados_con_eval_gt_95.length ? (
            <ul className="list-disc pl-5">
              {s.empleados_con_eval_gt_95.map(emp => <li key={emp.id || emp.id_empleado}>{emp.nombre} — Eval: {emp.evaluacion_desempeno}</li>)}
            </ul>
          ) : <p>No hay empleados con evaluación &gt; 95</p>}
        </div>
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Personal con más de 10 años</h5>
          {Array.isArray(s.personal_mas_10) && s.personal_mas_10.length ? (
            <ul className="list-disc pl-5">
              {s.personal_mas_10.map(emp => <li key={emp.id || emp.id_empleado}>{emp.nombre} — Antigüedad: {emp.antiguedad}</li>)}
            </ul>
          ) : <p>No hay personal con más de 10 años</p>}
        </div>
      </div>
      {/* correlaciones y evaluaciones por departamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Correlación salario-desempeño</h5>
          <p className="text-2xl font-bold">{s.correlacion_salario_desempeno != null ? String(s.correlacion_salario_desempeno) : 'N/A'}</p>
        </div>
        <div className="card-surface text-center">
          <h5 className="text-sm text-slate-600">Correlación antigüedad-salario</h5>
          <p className="text-2xl font-bold">{s.correlacion_antiguedad_salario != null ? String(s.correlacion_antiguedad_salario) : 'N/A'}</p>
        </div>
        <div className="card-surface">
          <h5 className="text-lg font-medium mb-3">Evaluación promedio por departamento</h5>
          {evalDeptLabels.length ? (
            <Bar data={evalBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }} />
          ) : <p>No hay datos de evaluación por departamento</p>}
        </div>
      </div>
    </div>
  )
}
