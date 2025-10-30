import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { PUESTOS, DEPARTAMENTOS, SEXOS } from '../constants'

const empty = {
  nombre: '',
  departamento: '',
  puesto: '',
  salario_base: '',
  bonificacion: '',
  descuento: '',
  dui: '',
  telefono: '',
  correo: '',
  fecha_contratacion: '',
  fecha_nacimiento: '',
  sexo: 'M',
  evaluacion_desempeno: null,
  estado: 1,
}

export default function EmpleadoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [model, setModel] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  // no DUI/telefono fields in the current model

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
        if (j) {
          // prefer message, else try common field hints
          if (j.message) return j.message
          if (j.error) return j.error
          if (j.salario_base) return `Salario base inválido: ${j.salario_base}`
          if (j.departamento) return `Departamento: ${j.departamento}`
          if (j.puesto) return `Puesto: ${j.puesto}`
          return JSON.stringify(j)
        }
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
          // request the employee even if it's inactive. Backend supports `with_inactive` query param.
          const data = await api.get(id, { with_inactive: true })
          // normalize to our form shape
          setModel(prev => ({ ...prev, ...data }))
        } catch (err) {
          // If backend returns 404 for inactive employees, try a client-side fallback:
          // fetch a larger list including inactive and find the record by id.
          try {
            const status = err && err.status
            const bodyMsg = err && err.body && (err.body.message || JSON.stringify(err.body))
            const isInactive404 = status === 404 && bodyMsg && /no activo/i.test(String(bodyMsg))
            if (isInactive404) {
              const list = await api.list({ per_page: 1000, with_inactive: true })
              const arr = Array.isArray(list) ? list : (Array.isArray(list.data) ? list.data : [])
              const found = arr.find(it => String(it.id || it.id_empleado) === String(id))
              if (found) {
                setModel(prev => ({ ...prev, ...found }))
                setError(null)
                return
              }
            }
          } catch (e) {
            // ignore fallback errors, fall through to show original error
          }
          setError(formatErrorForBanner(err))
        }
      })()
    }
  }, [id])

  // Helpers: El Salvador timezone adjustments and date boundaries
  const esNow = () => {
    const now = new Date()
    // El Salvador is UTC-6
    const ms = now.getTime() - (6 * 60 * 60 * 1000)
    return new Date(ms)
  }
  const toDateInput = (d) => d.toISOString().slice(0,10)
  const minDate1900 = '1900-01-01'
  // birth max: by default today - 18 years, but if fecha_contratacion is set use fecha_contratacion - 18 years
  const getBirthMaxDate = () => {
    try {
      if (model.fecha_contratacion) {
        const fc = new Date(model.fecha_contratacion)
        if (!isNaN(fc.getTime())) {
          const d = new Date(fc)
          d.setFullYear(d.getFullYear() - 18)
          return toDateInput(d)
        }
      }
      const n = esNow()
      n.setFullYear(n.getFullYear() - 18)
      return toDateInput(n)
    } catch (e) {
      const n = esNow()
      n.setFullYear(n.getFullYear() - 18)
      return toDateInput(n)
    }
  }
  // contratacion max: today minus recentDays (prevent dates too close to now)
  const RECENT_DAYS_BLOCK = 2 // assumption: contratación cannot be within the last 2 days
  const contratacionMaxDate = (() => {
    const n = esNow()
    n.setDate(n.getDate() - RECENT_DAYS_BLOCK)
    return toDateInput(n)
  })()

  // Async uniqueness check (best-effort): use api.list with a search param and look for exact matches
  const checkUnique = async (field) => {
    try {
      const rawValue = String(model[field] || '').trim()
      const value = normalizeDigits(rawValue)
      if (!value) return
      // best-effort search; backend must return these fields in list for this to work
      const res = await api.list({ per_page: 50, search: value })
      const arr = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : [])
      const found = arr.find(item => {
        if (!item || !item[field]) return false
        // compare normalized digits to tolerate masked/unmasked variants
        return normalizeDigits(item[field]) === value
      })
      if (found && String(found.id || found.id_empleado || '') !== String(id || '')) {
        setFieldErrors(prev => ({ ...prev, [field]: `${field} ya está en uso` }))
      }
    } catch (e) {
      // ignore check failures; server will validate on submit
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    // immediate model update
    setModel(prev => ({ ...prev, [name]: value }))

    // clear the specific field error by default
    setFieldErrors(prev => { const c = { ...prev }; delete c[name]; return c })

    // If the contratación date changes, validate that existing birth date still satisfies 18yo at hiring
    if (name === 'fecha_contratacion' && value) {
      try {
        const fc = new Date(value)
        if (!isNaN(fc.getTime()) && model.fecha_nacimiento) {
          const fn = new Date(model.fecha_nacimiento)
          const birthLimitAtHiring = new Date(fc)
          birthLimitAtHiring.setFullYear(birthLimitAtHiring.getFullYear() - 18)
          if (isNaN(fn.getTime()) || fn > birthLimitAtHiring) {
            setFieldErrors(prev => ({ ...prev, fecha_nacimiento: 'Empleado debe tener al menos 18 años al momento de la contratación' }))
          } else {
            setFieldErrors(prev => { const c = { ...prev }; delete c.fecha_nacimiento; return c })
          }
        }
      } catch (_) {}
    }

    // If birth date changes, check it against current contratación (if present)
    if (name === 'fecha_nacimiento' && value && model.fecha_contratacion) {
      try {
        const fn = new Date(value)
        const fc = new Date(model.fecha_contratacion)
        if (!isNaN(fn.getTime()) && !isNaN(fc.getTime())) {
          const birthLimitAtHiring = new Date(fc)
          birthLimitAtHiring.setFullYear(birthLimitAtHiring.getFullYear() - 18)
          if (fn > birthLimitAtHiring) {
            setFieldErrors(prev => ({ ...prev, fecha_nacimiento: 'Empleado debe tener al menos 18 años al momento de la contratación' }))
          } else {
            setFieldErrors(prev => { const c = { ...prev }; delete c.fecha_nacimiento; return c })
          }
        }
      } catch (_) {}
    }
  }

  // Format numeric-like fields to 2 decimals on blur (keeps string representation in inputs)
  const formatNumericField = (name) => {
    const v = model[name]
    if (v === '' || v === null || v === undefined) return
    const s = String(v).replace(/,/g, '').trim()
    if (s === '') return
    const n = Number(s)
    if (Number.isNaN(n)) return
    // keep two decimals for money, one decimal for evaluacion_desempeno per spec
    const fixed = name === 'evaluacion_desempeno' ? n.toFixed(1) : n.toFixed(2)
    setModel(prev => ({ ...prev, [name]: fixed }))
  }

  // --- Masks and helpers for DUI and Telefono ---
  const normalizeDigits = (s) => String(s || '').replace(/\D/g, '')

  const formatDui = (raw) => {
    const d = normalizeDigits(raw)
    // expect 9 digits (8 + 1 check) or more; format as 8digits-1digit if available
    if (!d) return ''
    const left = d.slice(0, 8)
    const right = d.slice(8, 9)
    return right ? `${left}-${right}` : left
  }

  const formatTelefono = (raw) => {
    const d = normalizeDigits(raw)
    if (!d) return ''
    // format as 4-4 (xxxx-xxxx). If more digits, append after second group
    const a = d.slice(0,4)
    const b = d.slice(4,8)
    return b ? `${a}-${b}` : a
  }

  // specialized change handlers keep only digits while typing but keep user-friendly dash placement
  const handleDuiChange = (e) => {
    const raw = e.target.value || ''
    const digits = normalizeDigits(raw).slice(0,9) // limit to 9 digits
    // show intermediate formatting
    const formatted = formatDui(digits)
    setModel(prev => ({ ...prev, dui: formatted }))
    setFieldErrors(prev => { const c = { ...prev }; delete c.dui; return c })
  }

  const handleTelefonoChange = (e) => {
    const raw = e.target.value || ''
    const digits = normalizeDigits(raw).slice(0,20) // allow longer but typical 8
    const formatted = formatTelefono(digits)
    setModel(prev => ({ ...prev, telefono: formatted }))
    setFieldErrors(prev => { const c = { ...prev }; delete c.telefono; return c })
  }

  const handleDuiBlur = async () => {
    setModel(prev => ({ ...prev, dui: formatDui(prev.dui) }))
    await checkUnique('dui')
  }

  const handleTelefonoBlur = async () => {
    setModel(prev => ({ ...prev, telefono: formatTelefono(prev.telefono) }))
    await checkUnique('telefono')
  }

  

  const submit = async (e) => {
    e.preventDefault()
    // enhanced validation according to provided schema
    const errs = {}
    // nombre: required, max 100
    if (!model.nombre || String(model.nombre).trim() === '') errs.nombre = 'Nombre es obligatorio'
    else if (String(model.nombre).trim().length > 100) errs.nombre = 'Nombre debe tener máximo 100 caracteres'

    // departamento: required, max 50
    if (!model.departamento || String(model.departamento).trim() === '') errs.departamento = 'Departamento es obligatorio'
    else if (String(model.departamento).trim().length > 50) errs.departamento = 'Departamento debe tener máximo 50 caracteres'

    // puesto: required, max 50
    if (!model.puesto || String(model.puesto).trim() === '') errs.puesto = 'Puesto es obligatorio'
    else if (String(model.puesto).trim().length > 50) errs.puesto = 'Puesto debe tener máximo 50 caracteres'

    // salario_base: required, decimal >= 0
    if (model.salario_base === '' || model.salario_base === null || model.salario_base === undefined) errs.salario_base = 'Salario base es obligatorio'
    else {
      const num = Number(String(model.salario_base).replace(/,/g, ''))
      if (Number.isNaN(num)) errs.salario_base = 'Salario base debe ser un número'
      else if (num < 0) errs.salario_base = 'Salario base debe ser mayor o igual a 0'
      else if (Math.abs(Number((num * 100).toFixed(0)) - num * 100) > 0) errs.salario_base = 'Salario base admite hasta 2 decimales'
    }

    // dates: required and coherent
    if (!model.fecha_contratacion) errs.fecha_contratacion = 'Fecha de contratación es obligatoria'
    if (!model.fecha_nacimiento) errs.fecha_nacimiento = 'Fecha de nacimiento es obligatoria'
    if (model.fecha_nacimiento && model.fecha_contratacion) {
      const fn = new Date(model.fecha_nacimiento)
      const fc = new Date(model.fecha_contratacion)
      const today = new Date()
      if (isNaN(fn.getTime())) errs.fecha_nacimiento = 'Fecha de nacimiento inválida'
      if (isNaN(fc.getTime())) errs.fecha_contratacion = 'Fecha de contratación inválida'
      if (!errs.fecha_nacimiento && !errs.fecha_contratacion) {
        // Use El Salvador timezone semantics for "today"
        const esToday = esNow()
        if (fn > esToday) errs.fecha_nacimiento = 'Fecha de nacimiento no puede ser en el futuro'
        // prevent contratación very recent (within RECENT_DAYS_BLOCK)
        const contratacionLimit = (() => { const d = esNow(); d.setDate(d.getDate() - RECENT_DAYS_BLOCK); return d })()
        if (fc > esToday) errs.fecha_contratacion = 'Fecha de contratación no puede ser en el futuro'
        if (fc > contratacionLimit) errs.fecha_contratacion = `Fecha de contratación no puede estar dentro de los últimos ${RECENT_DAYS_BLOCK} días`
        if (fc < fn) errs.fecha_contratacion = 'Fecha de contratación no puede ser anterior a la fecha de nacimiento'
        // birth must be at least 18 years before the hiring date (majority at contratacion)
        // i.e., fecha_nacimiento <= fecha_contratacion - 18 years
        const birthLimitAtHiring = (() => { const d = new Date(fc); d.setFullYear(d.getFullYear() - 18); return d })()
        if (fn > birthLimitAtHiring) errs.fecha_nacimiento = 'Empleado debe tener al menos 18 años al momento de la contratación'
      }
    }

    // sexo: required and must be one of allowed
    const allowedSex = ['M','F','O']
    if (!model.sexo) errs.sexo = 'Sexo es obligatorio'
    else if (!allowedSex.includes(String(model.sexo))) errs.sexo = 'Sexo inválido'

    // numeric fields: bonificacion, descuento (required, non-negative, max 2 decimals)
    ['bonificacion','descuento'].forEach(k => {
      if (model[k] === '' || model[k] === null || model[k] === undefined) errs[k] = `${k} es obligatorio`
      else {
        const num = Number(String(model[k]).replace(/,/g, ''))
        if (Number.isNaN(num)) errs[k] = `${k} debe ser numérico`
        else if (num < 0) errs[k] = `${k} debe ser mayor o igual a 0`
        else if (Math.abs(Number((num * 100).toFixed(0)) - num * 100) > 0) errs[k] = `${k} admite hasta 2 decimales`
      }
    })

    // evaluacion_desempeno: required, 0..100, allow one decimal (5,1)
    if (model.evaluacion_desempeno === '' || model.evaluacion_desempeno === null || model.evaluacion_desempeno === undefined) {
      errs.evaluacion_desempeno = 'Evaluación es obligatoria'
    } else {
      const num = Number(String(model.evaluacion_desempeno).replace(/,/g, ''))
      if (Number.isNaN(num)) errs.evaluacion_desempeno = 'Evaluación debe ser numérica'
      else if (num < 0 || num > 100) errs.evaluacion_desempeno = 'Evaluación debe estar entre 0 y 100'
      else {
        // enforce 1 decimal place
        const fixed1 = Math.round(num * 10) / 10
        if (Math.abs(num - fixed1) > 1e-8) errs.evaluacion_desempeno = 'Evaluación admite una sola cifra decimal'
      }
    }

    // DUI, teléfono y correo: required and basic formats
    if (!model.dui || String(model.dui).trim() === '') errs.dui = 'DUI es obligatorio'
    if (!model.telefono || String(model.telefono).trim() === '') errs.telefono = 'Teléfono es obligatorio'
    if (!model.correo || String(model.correo).trim() === '') errs.correo = 'Correo es obligatorio'
    if (model.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(model.correo))) errs.correo = 'Correo inválido'

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
            if (s.includes('salario')) return 'salario_base'
            if (s.includes('depart')) return 'departamento'
            if (s.includes('puesto')) return 'puesto'
            if (s.includes('sexo')) return 'sexo'
            if (s.includes('evalu') || s.includes('desempeno')) return 'evaluacion_desempeno'
            if (s.includes('email') || s.includes('correo') || s.includes('mail')) return 'correo'
            if (s.includes('phone') || s.includes('telefono') || s.includes('tel')) return 'telefono'
            if (s.includes('dui')) return 'dui'
            return null
          }

            // 1) If structured JSON with known keys, prefer that
          if (obj && typeof obj === 'object') {
            // common shapes: { field: 'dui', message: '...' } or { dui: '066..', message: '...' }
            const knownField = obj.field || obj.key || obj.tuple || null
            const candidateFromMsg = obj.message || obj.error || null
            const explicit = obj.salario_base || obj.departamento || obj.puesto || obj.sexo || obj.evaluacion_desempeno || obj.dui || obj.duiValue || obj.email || obj.correo || obj.telefono || obj.phone || null
            const field = normalizeField(knownField) || (explicit ? normalizeField(Object.keys(obj).find(k => ['salario_base','departamento','puesto','sexo','evaluacion_desempeno','dui','duiValue','email','correo','telefono','phone'].includes(k))) : null)
            const message = candidateFromMsg || (explicit ? String(explicit) : null)
            if (field || message) return { field: field || null, message: message || JSON.stringify(obj) }
          }

          // 2) Try parsing raw text / fallback strings
          const text = rawText || (err && err.message) || ''
          if (text) {
            // detect patterns like "Duplicate value for field 'dui': 066..." or "duplicate key 'dui'" or "E11000 duplicate key: { : \"dui\" }"
            const m1 = text.match(/field\s*['"]?(salario_base|departamento|puesto|sexo|evaluacion_desempeno|dui|email|correo|telefono|phone)['"]?/i)
            const m2 = text.match(/duplicate\s+key\s+['"]?(salario_base|departamento|puesto|sexo|evaluacion_desempeno|dui|email|correo|telefono|phone)['"]?/i)
            const m3 = text.match(/(salario_base|departamento|puesto|sexo|evaluacion_desempeno|dui|email|correo|telefono|phone)[:=]\s*([\w@\-\.]+)/i)
            const m4 = text.match(/E11000.*?index:\s*.*?\.(salario_base|departamento|puesto|sexo|evaluacion_desempeno|dui|email|correo|telefono|phone)\b/i)
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
  // build payload matching Laravel controller fields
  const payload = { ...model };
      // ensure numeric fields are numbers (send numbers to backend)
      ['salario_base','bonificacion','descuento','evaluacion_desempeno'].forEach(k => {
        if (payload[k] !== '' && payload[k] !== null && payload[k] !== undefined) {
          const n = Number(String(payload[k]).replace(/,/g, ''))
          if (Number.isNaN(n)) {
            payload[k] = payload[k]
          } else {
            // evaluacion_desempeno uses 1 decimal, money fields use 2 decimals
            payload[k] = k === 'evaluacion_desempeno' ? Number(Number(n).toFixed(1)) : Number(Number(n).toFixed(2))
          }
        } else {
          // ensure backend receives null rather than empty string for optional numbers
          payload[k] = null
        }
      })

      // business rule: descuento no puede ser mayor al salario bruto (salario_base + bonificacion)
      const sb = Number(payload.salario_base) || 0
      const bon = Number(payload.bonificacion) || 0
      const bruto = Number(Number(sb + bon).toFixed(2))
      if (Number(payload.descuento) > bruto) {
        setFieldErrors(prev => ({ ...prev, descuento: 'Descuento no puede ser mayor al salario bruto' }))
        setError('Corrige los errores del formulario')
        setLoading(false)
        return
      }

      // estado should be integer 1/0
      payload.estado = payload.estado ? Number(payload.estado) : 0

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
  const labelMap = { salario_base: 'Salario base', departamento: 'Departamento', puesto: 'Puesto' }
        const friendlyBanner = dup.field ? `El ${labelMap[dup.field] || dup.field} ya está en uso` : 'Ya existe un registro con valores duplicados'

        // Prefer a field-level detailed message if backend provided one, otherwise use friendlyBanner
        const fieldMessage = dup.message && String(dup.message).trim() ? String(dup.message) : friendlyBanner
        if (dup.field) {
          setFieldErrors(prev => ({ ...prev, [dup.field]: fieldMessage }))
          // try to focus the problematic field
          setTimeout(() => {
            try {
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
              <input maxLength={100} aria-invalid={!!fieldErrors.nombre} className="block w-full rounded border-slate-200 px-2 py-2" name="nombre" value={model.nombre || ''} onChange={handleChange} />
              {fieldErrors.nombre && <p className="text-sm text-red-600 mt-1">{fieldErrors.nombre}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DUI</label>
              <input maxLength={30} aria-invalid={!!fieldErrors.dui} className="block w-full rounded border-slate-200 px-2 py-2" name="dui" value={model.dui || ''} onChange={handleDuiChange} onBlur={handleDuiBlur} inputMode="numeric" placeholder="12345678-9" />
              {fieldErrors.dui && <p className="text-sm text-red-600 mt-1">{fieldErrors.dui}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input maxLength={30} aria-invalid={!!fieldErrors.telefono} className="block w-full rounded border-slate-200 px-2 py-2" name="telefono" value={model.telefono || ''} onChange={handleTelefonoChange} onBlur={handleTelefonoBlur} inputMode="tel" placeholder="2222-2222" />
              {fieldErrors.telefono && <p className="text-sm text-red-600 mt-1">{fieldErrors.telefono}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input maxLength={200} aria-invalid={!!fieldErrors.correo} className="block w-full rounded border-slate-200 px-2 py-2" name="correo" value={model.correo || ''} onChange={handleChange} onBlur={() => checkUnique('correo')} />
              <p className="text-xs text-slate-500 mt-1">Ej: usuario@dominio.com</p>
              {fieldErrors.correo && <p className="text-sm text-red-600 mt-1">{fieldErrors.correo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
              <select className="block w-full rounded border-slate-200 px-2 py-2" name="departamento" value={model.departamento || ''} onChange={handleChange}>
                <option value="">--Seleccione--</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {fieldErrors.departamento && <p className="text-sm text-red-600 mt-1">{fieldErrors.departamento}</p>}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Salario base</label>
              <input inputMode="decimal" aria-invalid={!!fieldErrors.salario_base} className="block w-full rounded border-slate-200 px-2 py-2" name="salario_base" value={model.salario_base || ''} onChange={handleChange} onBlur={() => formatNumericField('salario_base')} placeholder="0.00" />
              <p className="text-xs text-slate-500 mt-1">Formato: números con hasta 2 decimales. Ej: 1250.00</p>
              {fieldErrors.salario_base && <p className="text-sm text-red-600 mt-1">{fieldErrors.salario_base}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bonificación</label>
              <input inputMode="decimal" aria-invalid={!!fieldErrors.bonificacion} className="block w-full rounded border-slate-200 px-2 py-2" name="bonificacion" value={model.bonificacion || ''} onChange={handleChange} onBlur={() => formatNumericField('bonificacion')} placeholder="0.00" />
              {fieldErrors.bonificacion && <p className="text-sm text-red-600 mt-1">{fieldErrors.bonificacion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descuento</label>
              <input inputMode="decimal" aria-invalid={!!fieldErrors.descuento} className="block w-full rounded border-slate-200 px-2 py-2" name="descuento" value={model.descuento || ''} onChange={handleChange} onBlur={() => formatNumericField('descuento')} placeholder="0.00" />
              {fieldErrors.descuento && <p className="text-sm text-red-600 mt-1">{fieldErrors.descuento}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de contratación</label>
              <input type="date" min={minDate1900} max={contratacionMaxDate} className="block w-full rounded border-slate-200 px-2 py-2" name="fecha_contratacion" value={model.fecha_contratacion || ''} onChange={handleChange} />
              {fieldErrors.fecha_contratacion && <p className="text-sm text-red-600 mt-1">{fieldErrors.fecha_contratacion}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
              <input type="date" min={minDate1900} max={getBirthMaxDate()} className="block w-full rounded border-slate-200 px-2 py-2" name="fecha_nacimiento" value={model.fecha_nacimiento || ''} onChange={handleChange} />
              {fieldErrors.fecha_nacimiento && <p className="text-sm text-red-600 mt-1">{fieldErrors.fecha_nacimiento}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
              <select aria-invalid={!!fieldErrors.sexo} className="block w-full rounded border-slate-200 px-2 py-2" name="sexo" value={model.sexo || ''} onChange={handleChange}>
                {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                {/* ensure 'O' (Otro) present as fallback */}
                {!SEXOS.find(s => s.value === 'O') && <option value="O">Otro</option>}
              </select>
              {fieldErrors.sexo && <p className="text-sm text-red-600 mt-1">{fieldErrors.sexo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Evaluación desempeño</label>
              <input inputMode="decimal" aria-invalid={!!fieldErrors.evaluacion_desempeno} className="block w-full rounded border-slate-200 px-2 py-2" name="evaluacion_desempeno" value={model.evaluacion_desempeno || ''} onChange={handleChange} onBlur={() => formatNumericField('evaluacion_desempeno')} placeholder="0.00" />
              <p className="text-xs text-slate-500 mt-1">Rango 0–100. Ej: 95.50</p>
              {fieldErrors.evaluacion_desempeno && <p className="text-sm text-red-600 mt-1">{fieldErrors.evaluacion_desempeno}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select className="block w-full rounded border-slate-200 px-2 py-2" name="estado" value={model.estado} onChange={handleChange}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
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
