// Adaptado para backend Laravel
// Usa la variable de entorno Vite VITE_API_BASE si está disponible.
// Por defecto asume: http://localhost:8000/api/empleados (puerto típico de `php artisan serve`).
// Default points to the v1-prefixed routes used in the Laravel routes file
const DEFAULT_BASE = 'http://localhost:8000/api/v1/empleados'
const BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ? import.meta.env.VITE_API_BASE.replace(/\/+$/, '') : DEFAULT_BASE

async function parseBody(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

async function request(url, options = {}) {
  // Ensure Accept header for JSON APIs
  options.headers = options.headers || {}
  if (!options.headers.Accept) options.headers.Accept = 'application/json'

  const res = await fetch(url, options)
  if (!res.ok) {
    // try to parse error body for a helpful message
    let body
    try { body = await parseBody(res) } catch (e) { body = res.statusText }
    const msg = typeof body === 'string' && body ? body : JSON.stringify(body)
    const err = new Error(`${res.status} ${res.statusText} - ${msg}`)
    // attach parsed body for callers that need structured info
    err.status = res.status
    err.body = body
    throw err
  }
  // if 204 No Content
  if (res.status === 204) return null
  return parseBody(res)
}

function buildUrl(path = '', params = null) {
  // path may be like '/estadisticas' or ''
  const base = BASE.replace(/\/+$/, '')
  const p = path ? (`/${path.replace(/^\/+/, '')}`) : ''
  let url = `${base}${p}`
  if (params && Object.keys(params).length) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') search.append(k, String(v))
    })
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }
  return url
}

function apiRoot() {
  // remove trailing /empleados if present so we can call endpoints defined at root like /estadisticas
  return BASE.replace(/\/empleados\/?$/i, '').replace(/\/+$/, '')
}

export const api = {
  // small helper to normalize common backend shapes (Laravel resource typically returns `id`)
  _normalizeEmpleado: (obj) => {
    if (!obj || typeof obj !== 'object') return obj
    // if backend uses `id` instead of `id_empleado`, map it
    if (obj.id && !obj.id_empleado) obj.id_empleado = obj.id
    return obj
  },
  // list optionally accepts an object with query params: { puesto, estado, search, salario_mayor, salario_menor }
  list: async (params = null) => {
    const data = await request(buildUrl('', params))
    if (Array.isArray(data)) return data.map(item => api._normalizeEmpleado(item))
    // some APIs wrap with { data: [...] }
    if (data && Array.isArray(data.data)) return data.data.map(item => api._normalizeEmpleado(item))
    return data
  },
  // get a resource by id. Optional `params` will be appended as query string
  get: async (id, params = null) => {
    const data = await request(buildUrl(String(id), params))
    return api._normalizeEmpleado(data)
  },
  create: (body) => request(buildUrl(''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id, body) => request(buildUrl(String(id)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  remove: (id, force = false) => {
    const params = force ? { force: true } : null
    return request(buildUrl(String(id), params), { method: 'DELETE' })
  },
  // helpers compatibles con la API de Laravel: reenvían como query params al endpoint index
  filterByPuesto: (puesto) => api.list({ puesto }),
  filterByEstado: (estado) => api.list({ estado }),
  filterBySalarioMayor: (monto) => api.list({ salario_mayor: monto }),
  filterBySalarioMenor: (monto) => api.list({ salario_menor: monto }),
  // estadisticas: try root /api/v1/estadisticas first (preferred),
  // but fall back to /api/v1/empleados/estadisticas to support backends that register
  // the route under the resource path (and/or placed the route after the resource).
  estadisticas: async () => {
    const rootUrl = `${apiRoot()}/estadisticas`
    try {
      return await request(rootUrl)
    } catch (err) {
      // if first attempt fails, try resource-scoped endpoint (/empleados/estadisticas)
      try {
        return await request(buildUrl('estadisticas'))
      } catch (err2) {
        // preserve original error if second also fails
        throw err
      }
    }
  },
  // calculos may accept params (for example { with_inactive: true })
  calculos: (id, params = null) => request(buildUrl(`${String(id)}/calculos`, params)),
}

export default api
