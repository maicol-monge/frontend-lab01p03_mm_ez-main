import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { PUESTOS } from '../constants'

const empty = {
  nombre: '',
  apellido: '',
  dui: '',
  telefono: '',
  correo: '',
  direccion: '',
  fecha_contratacion: '',
  puesto: '',
  salario: '',
  estado: 'Activo'
}

export default function EmpleadoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [model, setModel] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const duiRef = useRef(null)

  // Format server-side messages into a concise, user-friendly banner string
  const formatErrorForBanner = (raw) => {
    try {
      if (!raw) return ''
      let txt = raw
      if (typeof txt !== 'string') {
        // try extract common shapes
        if (txt.message) return String(txt.message)
        if (txt.error) return String(txt.error)
        txt = JSON.stringify(txt)
      }
      // strip leading status codes like '409 - '
      txt = txt.replace(/^\s*\d{3}\s*-\s*/, '')
      // try to parse JSON inside
      try {
        const m = txt.match(/(\{[\s\S]*\})/)
        const j = m ? JSON.parse(m[1]) : JSON.parse(txt)
        if (j) return j.message || j.error || (j.dui ? `DUI already exists: ${j.dui}` : JSON.stringify(j))
      } catch (_) {
        // not JSON, continue
      }
      // fallback trimmed
      return txt.length > 300 ? txt.slice(0, 300) + '…' : txt
    } catch (e) {
      return 'Error desconocido'
    }
  }

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const data = await api.get(id)
          setModel(data)
        } catch (err) {
          setError(formatErrorForBanner(err))
        }
      })()
    }
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setModel(prev => ({ ...prev, [name]: value }))
    setFieldErrors(prev => { const c = { ...prev }; delete c[name]; return c })
  }

  const handleDuiChange = (e) => {
    let digits = String(e.target.value).replace(/\D/g, '')
    if (digits.length > 9) digits = digits.slice(0, 9)
    let formatted = digits
    if (digits.length > 8) formatted = digits.slice(0, 8) + '-' + digits.slice(8)
    setModel({ ...model, dui: formatted })
    setFieldErrors(prev => { const c = { ...prev }; delete c.dui; return c })
  }


  const handlePhoneChange = (e) => {
    // Expect user to type only the rest after the '503-' prefix.
    let digits = String(e.target.value).replace(/\D/g, '')
    if (digits.length > 8) digits = digits.slice(0, 8)
    // format as 4-4
    let formattedRest = digits
    if (digits.length > 4) formattedRest = digits.slice(0, 4) + '-' + digits.slice(4)
    const full = formattedRest ? `503-${formattedRest}` : '503-'
    setModel({ ...model, telefono: full })
    setFieldErrors(prev => { const c = { ...prev }; delete c.telefono; return c })
  }

  const handleEmailChange = (e) => {
    setModel({ ...model, correo: e.target.value })
    setFieldErrors(prev => { const c = { ...prev }; delete c.correo; return c })
  }

  const submit = async (e) => {
    e.preventDefault()
    // basic validation: no field can be empty
    const errs = {}
    if (!model.nombre) errs.nombre = 'Nombre es obligatorio'
    if (!model.apellido) errs.apellido = 'Apellido es obligatorio'
    if (!model.dui) errs.dui = 'DUI es obligatorio'
    if (!model.telefono) errs.telefono = 'Teléfono es obligatorio'
    if (!model.correo) errs.correo = 'Correo es obligatorio'
    if (!model.direccion) errs.direccion = 'Dirección es obligatoria'
    if (!model.fecha_contratacion) errs.fecha_contratacion = 'Fecha de contratación es obligatoria'
    if (!model.puesto) errs.puesto = 'Puesto es obligatorio'
    if (model.salario === '' || model.salario === null || model.salario === undefined) errs.salario = 'Salario es obligatorio'

    // format validations
    const duiRe = /^\d{8}-\d$/
    if (model.dui && !duiRe.test(model.dui)) errs.dui = 'Formato DUI inválido. Debe ser xxxxxxxx-x'

    const phoneRe = /^503-\d{4}-\d{4}$/
    if (model.telefono && !phoneRe.test(model.telefono)) errs.telefono = 'Teléfono inválido. Debe ser 503-xxxx-xxxx'

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (model.correo && !emailRe.test(model.correo)) errs.correo = 'Correo inválido'

    // date must be past or today in El Salvador (UTC-6)
    if (model.fecha_contratacion) {
      const selected = model.fecha_contratacion // 'YYYY-MM-DD'
      const todayES = (() => {
        const now = new Date()
        // shift to UTC-6
        const esMs = now.getTime() - (6 * 60 * 60 * 1000)
        const es = new Date(esMs)
        return es.toISOString().slice(0,10)
      })()
      if (selected > todayES) errs.fecha_contratacion = 'La fecha debe ser hoy o anterior (zona UTC-6)'
    }

    // salario numeric
    if (model.salario !== '' && model.salario !== null && model.salario !== undefined) {
      const num = Number(String(model.salario).toString().replace(/,/g, ''))
      if (Number.isNaN(num)) errs.salario = 'Salario debe ser un número'
      else if (num < 0) errs.salario = 'Salario inválido'
    }

    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      setError('Corrige los errores del formulario')
      return
    }
    setLoading(true)
    // helper: try to extract useful info when server returns 409 duplicate key
    const extractDuplicateInfo = (err) => {
      try {
        const resp = err && (err.response || err.res || err)
        const status = resp && (resp.status || resp.statusCode)
        if (status === 409) {
          const data = resp.data || resp.body || resp.response || err.data || err.message || null
          let obj = null
          let rawText = null
          if (data) {
            if (typeof data === 'string') {
              rawText = data
              // try direct parse, but also extract JSON substring like '409 - { ... }'
              try { obj = JSON.parse(data) } catch (_) {
                const m = String(data).match(/(\{[\s\S]*\})/)
                if (m) {
                  try { obj = JSON.parse(m[1]) } catch (__){ obj = { message: data } }
                } else {
                  obj = { message: data }
                }
              }
            } else {
              obj = data
            }
          }

          // helper to normalize a candidate field name to our model keys
          const normalizeField = (k) => {
            if (!k) return null
            const s = String(k).toLowerCase()
            if (s.includes('dui')) return 'dui'
            if (s.includes('email') || s.includes('correo') || s.includes('mail')) return 'correo'
            if (s.includes('phone') || s.includes('telefono') || s.includes('tel')) return 'telefono'
            return null
          }

          // 1) If structured JSON with known keys, prefer that
          if (obj && typeof obj === 'object') {
            // common shapes: { field: 'dui', message: '...' } or { dui: '066..', message: '...' }
            const knownField = obj.field || obj.key || obj.tuple || null
            const candidateFromMsg = obj.message || obj.error || null
            const explicit = obj.dui || obj.duiValue || obj.email || obj.correo || obj.telefono || obj.phone || null
            const field = normalizeField(knownField) || (explicit ? normalizeField(Object.keys(obj).find(k => ['dui','duiValue','email','correo','telefono','phone'].includes(k))) : null)
            const message = candidateFromMsg || (explicit ? String(explicit) : null)
            if (field || message) return { field: field || null, message: message || JSON.stringify(obj) }
          }

          // 2) Try parsing raw text / fallback strings
          const text = rawText || (err && err.message) || ''
          if (text) {
            // detect patterns like "Duplicate value for field 'dui': 066..." or "duplicate key 'dui'" or "E11000 duplicate key: { : \"dui\" }"
            const m1 = text.match(/field\s*['"]?(dui|email|correo|telefono|phone)['"]?/i)
            const m2 = text.match(/duplicate\s+key\s+['"]?(dui|email|correo|telefono|phone)['"]?/i)
            const m3 = text.match(/(dui|email|correo|telefono|phone)[:=]\s*([\w@\-\.]+)/i)
            const m4 = text.match(/E11000.*?index:\s*.*?\.(dui|email|correo|telefono|phone)\b/i)
            const found = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || (m4 && m4[1]) || null
            if (found) {
              const fld = normalizeField(found)
              const value = (m3 && m3[2]) || null
              const msg = value ? `${found.toUpperCase()} ya existe: ${value}` : text
              return { field: fld, message: msg }
            }
            // as a last attempt, if text contains 'duplicate' return generic
            if (/duplicate/i.test(text) || /duplicad/i.test(text)) return { field: null, message: text }
          }

          // fallback
          return { field: null, message: err.message || 'Recurso duplicado (409)' }
        }
      } catch (e) {
        // ignore
      }
      return null
    }

    try {
  // normalize salario to number-like string (backend expects numeric)
  const payload = { ...model }
      // ensure estado matches backend enum style: 'Activo' or 'Inactivo'
      if (payload.estado) {
        const s = String(payload.estado).trim()
        payload.estado = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      }
      // ensure fecha_contratacion is in yyyy-mm-dd (input type=date returns this)
      // ensure salario is numeric if possible
      if (payload.salario !== undefined && payload.salario !== null && payload.salario !== '') {
        const num = Number(String(payload.salario).replace(/,/g, ''))
        if (!Number.isNaN(num)) payload.salario = num
        else payload.salario = payload.salario.toString()
      }
      // ensure salario sent as number
      if (payload.salario !== '' && payload.salario !== null && payload.salario !== undefined) {
        const num = Number(String(payload.salario).replace(/,/g, ''))
        payload.salario = Number.isNaN(num) ? payload.salario : num
      }

      if (id) {
        await api.update(id, payload)
      } else {
        await api.create(payload)
      }
      // success: navigate back to list
      nav('/empleados')
    } catch (err) {
      console.error('Error creating/updating empleado:', err)
      const dup = extractDuplicateInfo(err)
      if (dup) {
        // Map to friendly labels
        const labelMap = { dui: 'DUI', telefono: 'Teléfono', correo: 'Correo' }
        const friendlyBanner = dup.field ? `El ${labelMap[dup.field] || dup.field} ya está en uso` : 'Ya existe un registro con valores duplicados'

        // Prefer a field-level detailed message if backend provided one, otherwise use friendlyBanner
        const fieldMessage = dup.message && String(dup.message).trim() ? String(dup.message) : friendlyBanner
        if (dup.field) {
          setFieldErrors(prev => ({ ...prev, [dup.field]: fieldMessage }))
          // try to focus the problematic field (use ref for DUI, querySelector otherwise)
          setTimeout(() => {
            try {
              if (dup.field === 'dui') {
                duiRef.current && duiRef.current.focus()
                return
              }
              const selectorName = dup.field === 'telefono' ? '[name="telefono_rest"]' : `[name="${dup.field}"]`
              const el = document.querySelector(selectorName)
              if (el && typeof el.focus === 'function') el.focus()
            } catch (_) {}
          }, 50)
        }
        // show a short, friendly banner (avoid dumping raw JSON)
        setError(friendlyBanner)
      } else {
        // generic fallback: try to read response message
        const resp = err && (err.response || err.res || err)
        const data = resp && (resp.data || resp.body || resp.response || err.data)
        let message = err.message || data || 'Error desconocido'
        try {
          if (data) message = typeof data === 'string' ? data : (data.message || data.error || JSON.stringify(data))
        } catch (_) {}
        setError(formatErrorForBanner(message))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="card-surface">
        <h3 className="text-lg font-medium mb-3">{id ? 'Editar' : 'Crear'} Empleado</h3>
        {error && <div className="rounded bg-red-50 text-red-700 p-3 mb-3">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input className="block w-full rounded border-slate-200 px-2 py-2" name="nombre" value={model.nombre || ''} onChange={handleChange} />
              {fieldErrors.nombre && <p className="text-sm text-red-600 mt-1">{fieldErrors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input className="block w-full rounded border-slate-200 px-2 py-2" name="apellido" value={model.apellido || ''} onChange={handleChange} />
              {fieldErrors.apellido && <p className="text-sm text-red-600 mt-1">{fieldErrors.apellido}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DUI</label>
              <input ref={duiRef} className={`block w-full rounded px-2 py-2 ${fieldErrors.dui ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} name="dui" value={model.dui || ''} onChange={handleDuiChange} placeholder="00000000-0" />
              {fieldErrors.dui && <p className="text-sm text-red-600 mt-1">{fieldErrors.dui}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-2 rounded-l border border-slate-200 bg-slate-100 text-slate-700">503-</span>
                <input className="flex-1 rounded-r border border-slate-200 px-2 py-2" name="telefono_rest" value={(model.telefono || '').replace(/^503-/, '')} onChange={handlePhoneChange} placeholder="7777-7777" />
              </div>
              {fieldErrors.telefono && <p className="text-sm text-red-600 mt-1">{fieldErrors.telefono}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
              <select className="block w-full rounded border-slate-200 px-2 py-2" name="puesto" value={model.puesto || ''} onChange={handleChange}>
                <option value="">--Seleccione--</option>
                {PUESTOS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {fieldErrors.puesto && <p className="text-sm text-red-600 mt-1">{fieldErrors.puesto}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salario</label>
              <input inputMode="decimal" className="block w-full rounded border-slate-200 px-2 py-2" name="salario" value={model.salario || ''} onChange={handleChange} />
              {fieldErrors.salario && <p className="text-sm text-red-600 mt-1">{fieldErrors.salario}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input type="email" className="block w-full rounded border-slate-200 px-2 py-2" name="correo" value={model.correo || ''} onChange={handleEmailChange} placeholder="email@ejemplo.com" />
              {fieldErrors.correo && <p className="text-sm text-red-600 mt-1">{fieldErrors.correo}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input className="block w-full rounded border-slate-200 px-2 py-2" name="direccion" value={model.direccion || ''} onChange={handleChange} placeholder="Calle, colonia, ciudad" />
              {fieldErrors.direccion && <p className="text-sm text-red-600 mt-1">{fieldErrors.direccion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de contratación</label>
              <input type="date" className="block w-full rounded border-slate-200 px-2 py-2" name="fecha_contratacion" value={model.fecha_contratacion || ''} onChange={handleChange} max={(function(){const now=new Date();const esMs=now.getTime()-(6*60*60*1000);return new Date(esMs).toISOString().slice(0,10)})()} />
              {fieldErrors.fecha_contratacion && <p className="text-sm text-red-600 mt-1">{fieldErrors.fecha_contratacion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select className="block w-full rounded border-slate-200 px-2 py-2" name="estado" value={model.estado} onChange={handleChange}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn-primary-tailwind" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => window.history.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
