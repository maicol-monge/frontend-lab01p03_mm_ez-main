import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'

function formatCurrency(v) {
  if (v === null || v === undefined) return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(v, decimals = 2) {
  if (v === null || v === undefined) return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function formatDate(d) {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString(undefined)
  } catch (_) {
    return String(d)
  }
}

export default function EmpleadoDetalle() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.calculos(id)
      setData(res)
      setError(null)
    } catch (err) {
      // api.request produces Error with .status and .body sometimes
      const msg = (err && (err.message || (err.body && JSON.stringify(err.body)) || err)) || 'Error cargando datos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return (<div className="page-container"><p>Cargando detalle...</p></div>)

  if (error) return (
    <div className="page-container">
      <div className="card-surface">
        <h3 className="text-lg font-medium mb-3">Detalle del empleado</h3>
        <div className="rounded bg-red-50 text-red-700 p-3 mb-3">{String(error)}</div>
        <div className="flex gap-2">
          <Link to="/empleados" className="rounded border px-3 py-2">Volver</Link>
        </div>
      </div>
    </div>
  )

  if (!data) return (<div className="page-container"><p>No hay datos</p></div>)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Empleado: {data.nombre || `#${data.id}`}</h2>
        <div className="flex gap-2">
          <Link to={`/empleados/editar/${data.id}`} className="btn-primary-tailwind">Editar</Link>
          <Link to="/empleados" className="rounded border px-3 py-2">Volver</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card-surface">
          <h4 className="font-medium">Información</h4>
          <div className="mt-2 text-sm text-slate-700">ID: <span className="font-semibold">{data.id}</span></div>
          <div className="mt-1 text-sm text-slate-700">Nombre: <span className="font-semibold">{data.nombre}</span></div>
            <div className="mt-1 text-sm text-slate-700">DUI: <span className="font-semibold">{data.dui || '-'}</span></div>
            <div className="mt-1 text-sm text-slate-700">Teléfono: <span className="font-semibold">{data.telefono ? <a className="text-blue-600 underline" href={`tel:${data.telefono}`}>{data.telefono}</a> : '-'}</span></div>
            <div className="mt-1 text-sm text-slate-700">Correo: <span className="font-semibold">{data.correo ? <a className="text-blue-600 underline" href={`mailto:${data.correo}`}>{data.correo}</a> : '-'}</span></div>
          <div className="mt-1 text-sm text-slate-700">Fecha de contratación: <span className="font-semibold">{formatDate(data.fecha_contratacion)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Salario base: <span className="font-semibold">{formatCurrency(data.salario_base)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Bonificación: <span className="font-semibold">{formatCurrency(data.bonificacion)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Descuento: <span className="font-semibold">{formatCurrency(data.descuento)}</span></div>
        </div>

        <div className="card-surface">
          <h4 className="font-medium">Cálculos</h4>
          <div className="mt-2 text-sm text-slate-700">Salario bruto: <span className="font-semibold">{formatCurrency(data.salario_bruto)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Salario neto: <span className="font-semibold">{formatCurrency(data.salario_neto)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Evaluación: <span className="font-semibold">{data.evaluacion_desempeno === null ? '-' : formatNumber(data.evaluacion_desempeno, 2)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Ratio desempeño/salario: <span className="font-semibold">{data.ratio_desempeno_salario === null || data.ratio_desempeno_salario === undefined ? '-' : formatNumber(data.ratio_desempeno_salario, 2)}</span></div>
          { (data.ratio_desempeno_salario === null || data.ratio_desempeno_salario === undefined) && (
            <p className="text-xs text-slate-500 mt-1">No disponible — {Number(data.salario_base) === 0 ? 'salario base = 0' : (data.evaluacion_desempeno == null ? 'evaluación no definida' : 'datos insuficientes')}</p>
          )}
        </div>

        <div className="card-surface">
          <h4 className="font-medium">Perfil temporal</h4>
          <div className="mt-2 text-sm text-slate-700">Edad: <span className="font-semibold">{data.edad == null ? '-' : formatNumber(data.edad, 2)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Antigüedad (años): <span className="font-semibold">{data.antiguedad == null ? '-' : formatNumber(data.antiguedad, 2)}</span></div>
          <div className="mt-1 text-sm text-slate-700">Última actualización: <span className="font-semibold">{data.updated_at || '-'}</span></div>
        </div>
      </div>

      <div className="card-surface">
        <h4 className="font-medium mb-2">Acciones</h4>
        <div className="flex gap-2">
          <button onClick={load} className="rounded border px-3 py-2">Recalcular</button>
          <Link to={`/empleados/editar/${data.id}`} className="rounded border px-3 py-2">Editar</Link>
          <Link to="/empleados" className="rounded border px-3 py-2">Volver a la lista</Link>
        </div>
      </div>
    </div>
  )
}
