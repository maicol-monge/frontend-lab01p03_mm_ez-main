import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { PUESTOS } from '../constants'

export default function EmpleadosList() {
  const [empleados, setEmpleados] = useState([])
  const [allEmpleados, setAllEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroPuesto, setFiltroPuesto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [monto, setMonto] = useState('')
  const [salarioComp, setSalarioComp] = useState('>')
  const [searchTerm, setSearchTerm] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.list()
      setEmpleados(data)
      setAllEmpleados(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const eliminar = async (id) => {
    if (!confirm('Eliminar empleado?')) return
    await api.remove(id)
    await load()
  }

  // Apply filters client-side so filters can be combined
  const aplicarFiltros = () => {
    let res = [...allEmpleados]
    const q = (searchTerm || '').trim().toLowerCase()
    if (q) {
      res = res.filter(e => {
        const full = `${e.nombre || ''} ${e.apellido || ''}`.toLowerCase()
        return (
          full.includes(q) ||
          (String(e.dui || '').toLowerCase().includes(q)) ||
          (String(e.correo || '').toLowerCase().includes(q)) ||
          (String(e.telefono || '').toLowerCase().includes(q)) ||
          (String(e.puesto || '').toLowerCase().includes(q))
        )
      })
    }
    if (filtroPuesto) res = res.filter(e => e.puesto === filtroPuesto)
    if (filtroEstado) res = res.filter(e => (e.estado || '').toLowerCase() === filtroEstado.toLowerCase())
    if (monto) {
      const num = parseFloat(monto)
      if (!Number.isNaN(num)) {
        if (salarioComp === '>') res = res.filter(e => parseFloat(e.salario) > num)
        else res = res.filter(e => parseFloat(e.salario) < num)
      }
    }
    setEmpleados(res)
  }

  const clearFiltros = () => {
    setFiltroPuesto('')
    setFiltroEstado('')
    setMonto('')
    setSalarioComp('>')
    setSearchTerm('')
    setEmpleados(allEmpleados)
  }

  // auto-apply when filters change (including search)
  useEffect(() => {
    aplicarFiltros()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPuesto, filtroEstado, monto, salarioComp, searchTerm, allEmpleados])

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Empleados</h2>
        <Link to="/empleados/nuevo" className="btn-primary-tailwind">Crear empleado</Link>
      </div>

      <div className="mb-4">
        <label className="sr-only" htmlFor="search">Buscar</label>
        <div className="relative">
          <input
            id="search"
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, DUI, correo, teléfono o puesto"
            className="w-full rounded border-slate-200 px-3 py-2"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">Limpiar</button>
          )}
        </div>
      </div>

      <div className="card-surface mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
            <select className="block w-full md:w-60 rounded border-slate-200" value={filtroPuesto} onChange={e => setFiltroPuesto(e.target.value)}>
              <option value="">--</option>
              {PUESTOS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select className="block w-full md:w-60 rounded border-slate-200" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">--</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salario monto</label>
            <div className="flex gap-2">
              <select className="rounded border-slate-200 w-28 md:w-36" value={salarioComp} onChange={e => setSalarioComp(e.target.value)}>
                <option value=">">mayor que</option>
                <option value="<">menor que</option>
              </select>
              <input className="flex-1 rounded border-slate-200 px-2" value={monto} onChange={e => setMonto(e.target.value)} placeholder="1000.00" />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary-tailwind" onClick={aplicarFiltros}>Aplicar filtros</button>
            <button className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={clearFiltros}>Limpiar</button>
            <button className="ml-auto rounded border border-red-400 px-3 py-2 text-sm text-red-700" onClick={load}>Recargar</button>
          </div>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <div className="rounded bg-red-50 text-red-700 p-3">{error}</div>}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full tg-table bg-white rounded shadow-sm table-auto">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left">ID</th>
              <th className="text-left">Nombre</th>
              <th className="text-left">DUI</th>
              <th className="text-left">Teléfono</th>
              <th className="text-left">Correo</th>
              <th className="text-left">Puesto</th>
              <th className="text-left">Salario</th>
              <th className="text-left">Fecha</th>
              <th className="text-left">Estado</th>
              <th className="text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(e => (
              <tr key={e.id_empleado} className="hover:bg-slate-50">
                <td className="tg-table td">{e.id_empleado}</td>
                <td className="tg-table td">{e.nombre} {e.apellido}</td>
                <td className="tg-table td">{e.dui}</td>
                <td className="tg-table td">{e.telefono}</td>
                <td className="tg-table td">{e.correo}</td>
                <td className="tg-table td">{e.puesto}</td>
                <td className="tg-table td">{e.salario}</td>
                <td className="tg-table td">{e.fecha_contratacion}</td>
                <td className="tg-table td">{e.estado}</td>
                <td className="tg-table td">
                  <Link to={`/empleados/editar/${e.id_empleado}`} className="inline-block px-2 py-1 border border-sky-200 text-sky-700 rounded text-sm mr-2">Editar</Link>
                  <button className="inline-block px-2 py-1 border border-red-200 text-red-700 rounded text-sm" onClick={() => eliminar(e.id_empleado)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

  {/* mobile-friendly cards (visible only on small screens) */}
  <div className="mobile-list mt-4 space-y-3 md:hidden">
        {empleados.map(e => (
          <div key={e.id_empleado} className="card-surface">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1">
                <div className="text-sm text-slate-500">ID {e.id_empleado}</div>
                <div className="text-lg font-medium text-slate-800">{e.nombre} {e.apellido}</div>
                <div className="text-sm text-slate-600">{e.puesto} • {e.estado}</div>
                <div className="mt-2 text-sm text-slate-700">Salario: <span className="font-semibold">{e.salario}</span></div>
                <div className="mt-1 text-sm text-slate-500">DUI: {e.dui} • Tel: {e.telefono}</div>
                {e.correo && <div className="text-sm text-slate-500 truncate">Email: {e.correo}</div>}
                {e.direccion && <div className="text-sm text-slate-500 truncate">Dir: {e.direccion}</div>}
                {e.fecha_contratacion && <div className="text-sm text-slate-500">Contratado: {e.fecha_contratacion}</div>}
              </div>
              <div className="flex gap-2 mt-3 md:mt-0 md:ml-4 justify-end items-end">
                <Link to={`/empleados/editar/${e.id_empleado}`} className="inline-block px-3 py-1 rounded-md border border-brand-200 text-brand-700 text-sm">Editar</Link>
                <button className="inline-block px-3 py-1 rounded-md border border-red-200 text-red-700 text-sm" onClick={() => eliminar(e.id_empleado)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
