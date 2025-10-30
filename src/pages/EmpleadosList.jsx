import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { PUESTOS, DEPARTAMENTOS, SEXOS, ESTADOS } from '../constants'

export default function EmpleadosList() {
  // normalize estado values for comparison and for API params
  const normalizeEstado = (v) => {
    if (v === null || v === undefined || v === '') return ''
    if (typeof v === 'boolean') return v ? '1' : '0'
    // numbers -> '1' or '0'
    if (typeof v === 'number') return String(v)
    return String(v).trim()
  }
  const [empleados, setEmpleados] = useState([])
  const [allEmpleados, setAllEmpleados] = useState([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroDepartamento, setFiltroDepartamento] = useState('')
  const [filtroPuesto, setFiltroPuesto] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [monto, setMonto] = useState('')
  const [salarioComp, setSalarioComp] = useState('>')
  const [searchTerm, setSearchTerm] = useState('')

  const load = async (opts = {}) => {
    setLoading(true)
    try {
      const normalizedEstado = normalizeEstado(filtroEstado)
      const sexoParam = (filtroSexo && filtroSexo !== '') ? filtroSexo : undefined
      const params = {
        per_page: perPage,
        departamento: filtroDepartamento || undefined,
        puesto: filtroPuesto || undefined,
        sexo: sexoParam,
        estado: normalizedEstado !== '' ? (normalizedEstado === '1' ? 1 : (normalizedEstado === '0' ? 0 : normalizedEstado)) : undefined,
        with_inactive: opts.with_inactive ? true : undefined,
        page: opts.page || page,
      }
      const data = await api.list(params)
      // handle paginated response from Laravel (data.data)
      if (Array.isArray(data)) {
        setEmpleados(data)
        setAllEmpleados(data)
        setTotal(data.length)
        setLastPage(1)
        setPage(1)
      } else if (data && Array.isArray(data.data)) {
        setEmpleados(data.data)
        setAllEmpleados(data.data)
        setTotal(data.total || 0)
        setPerPage(data.per_page || perPage)
        setLastPage(data.last_page || 1)
        setPage(data.current_page || 1)
      } else {
        // fallback
        setEmpleados(data)
        setAllEmpleados(data)
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar empleado? (Aceptar = desactivar; Cancelar = cancelar)')) return
    const force = confirm('¿Eliminar permanentemente? (Aceptar = permanente, Cancelar = solo desactivar)')
    await api.remove(id, force)
    await load({ with_inactive: true })
  }

  // Apply filters client-side so search can be combined with server-side filters
  const aplicarFiltros = () => {
    let res = [...allEmpleados]
    const q = (searchTerm || '').trim().toLowerCase()
    if (q) {
      res = res.filter(e => {
        const full = `${e.nombre || ''} ${e.departamento || ''} ${e.puesto || ''}`.toLowerCase()
        return (
          full.includes(q) ||
          (String(e.sexo || '').toLowerCase().includes(q))
        )
      })
    }
  if (filtroDepartamento) res = res.filter(e => e.departamento === filtroDepartamento)
  if (filtroPuesto) res = res.filter(e => e.puesto === filtroPuesto)
  if (filtroSexo) res = res.filter(e => String(e.sexo || '').toLowerCase() === String(filtroSexo).toLowerCase())
  if (filtroEstado) {
    const nf = normalizeEstado(filtroEstado)
    res = res.filter(e => normalizeEstado(e.estado) === nf)
  }
    if (monto) {
      const num = parseFloat(monto)
      if (!Number.isNaN(num)) {
        if (salarioComp === '>') res = res.filter(e => parseFloat(e.salario_base) > num)
        else res = res.filter(e => parseFloat(e.salario_base) < num)
      }
    }
    setEmpleados(res)
  }

  const clearFiltros = () => {
    setFiltroDepartamento('')
    setFiltroPuesto('')
    setFiltroSexo('')
    setFiltroEstado('')
    setMonto('')
    setSalarioComp('>')
    setSearchTerm('')
    setEmpleados(allEmpleados)
    // reload default
    load({ with_inactive: false })
  }

  // auto-apply when filters change (including search)
  useEffect(() => {
    aplicarFiltros()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroDepartamento, filtroPuesto, filtroSexo, filtroEstado, monto, salarioComp, searchTerm, allEmpleados])

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
            placeholder="Buscar por nombre, departamento, puesto o sexo"
            className="w-full rounded border-slate-200 px-3 py-2"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">Limpiar</button>
          )}
        </div>
      </div>

          <div className="card-surface mb-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                <select className="block w-full rounded border-slate-200" value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)}>
              <option value="">--</option>
              {DEPARTAMENTOS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
            <select className="block w-full rounded border-slate-200" value={filtroPuesto} onChange={e => setFiltroPuesto(e.target.value)}>
              <option value="">--</option>
              {PUESTOS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
            <select className="block w-full rounded border-slate-200" value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}>
              <option value="">--</option>
              {SEXOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select className="block w-full rounded border-slate-200" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">--</option>
              {ESTADOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Salario monto</label>
            <div className="flex gap-2">
              <select className="rounded border-slate-200 w-28" value={salarioComp} onChange={e => setSalarioComp(e.target.value)}>
                <option value=">">mayor que</option>
                <option value="<">menor que</option>
              </select>
              <input className="w-28 md:w-40 rounded border-slate-200 px-2" value={monto} onChange={e => setMonto(e.target.value)} placeholder="1000.00" />
            </div>
          </div>

          {/* Buttons moved out below to a separate row so inputs (especialmente salario) nunca se solapen */}
        </div>
        <div className="mt-3 flex flex-wrap md:flex-nowrap justify-end gap-2">
          <button className="btn-primary-tailwind whitespace-nowrap" onClick={() => load({ with_inactive: false, page: 1 })}>Aplicar filtros</button>
          <button className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 whitespace-nowrap" onClick={clearFiltros}>Limpiar</button>
          <button className="rounded border border-red-400 px-3 py-2 text-sm text-red-700 whitespace-nowrap" onClick={() => load({ with_inactive: true })}>Recargar (incluye inactivos)</button>
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
              <th className="text-left">Departamento</th>
              <th className="text-left">Puesto</th>
              <th className="text-left">Salario base</th>
              <th className="text-left">Bonif.</th>
              <th className="text-left">Desc.</th>
              <th className="text-left">Fecha contratación</th>
              <th className="text-left">Sexo</th>
              <th className="text-left">Estado</th>
              <th className="text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(e => (
              <tr key={e.id_empleado} className="hover:bg-slate-50">
                <td className="tg-table td">{e.id_empleado}</td>
                <td className="tg-table td">{e.nombre}</td>
                <td className="tg-table td">{e.departamento}</td>
                <td className="tg-table td">{e.puesto}</td>
                <td className="tg-table td">{e.salario_base}</td>
                <td className="tg-table td">{e.bonificacion}</td>
                <td className="tg-table td">{e.descuento}</td>
                <td className="tg-table td">{e.fecha_contratacion}</td>
                <td className="tg-table td">{e.sexo}</td>
                <td className="tg-table td">{e.estado === 1 ? 'Activo' : 'Inactivo'}</td>
                <td className="tg-table td">
                  <Link to={`/empleados/${e.id_empleado}`} aria-label={`Ver ${e.nombre}`} className="inline-block px-2 py-1 rounded text-sm mr-2 bg-green-600 text-white hover:bg-green-700">Ver</Link>
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
                <div className="text-lg font-medium text-slate-800">{e.nombre}</div>
                <div className="text-sm text-slate-600">{e.puesto} • {e.departamento} • {e.estado === 1 ? 'Activo' : 'Inactivo'}</div>
                <div className="mt-2 text-sm text-slate-700">Salario base: <span className="font-semibold">{e.salario_base}</span></div>
                {e.fecha_contratacion && <div className="text-sm text-slate-500">Contratado: {e.fecha_contratacion}</div>}
              </div>
                <div className="flex gap-2 mt-3 md:mt-0 md:ml-4 justify-end items-end">
                <Link to={`/empleados/${e.id_empleado}`} aria-label={`Ver ${e.nombre}`} className="inline-block px-3 py-1 rounded-md text-sm bg-green-600 text-white hover:bg-green-700">Ver</Link>
                <Link to={`/empleados/editar/${e.id_empleado}`} className="inline-block px-3 py-1 rounded-md border border-brand-200 text-brand-700 text-sm">Editar</Link>
                <button className="inline-block px-3 py-1 rounded-md border border-red-200 text-red-700 text-sm" onClick={() => eliminar(e.id_empleado)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* pagination */}
      <div className="mt-4 flex items-center gap-2">
        <div>Page {page} / {lastPage} — Total: {total}</div>
        <button className="rounded border px-2 py-1" disabled={page <= 1} onClick={() => load({ page: page - 1 })}>Anterior</button>
        <button className="rounded border px-2 py-1" disabled={page >= lastPage} onClick={() => load({ page: page + 1 })}>Siguiente</button>
        <select className="ml-auto rounded border px-2 py-1" value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); load({ page: 1 }) }}>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  )
}
