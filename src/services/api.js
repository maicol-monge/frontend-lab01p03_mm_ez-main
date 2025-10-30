const BASE = 'http://localhost:8080/api/empleados'

async function parseBody(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

async function request(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    // try to parse error body for a helpful message
    let body
    try { body = await parseBody(res) } catch (e) { body = res.statusText }
    const msg = typeof body === 'string' && body ? body : JSON.stringify(body)
    throw new Error(`${res.status} ${res.statusText} - ${msg}`)
  }
  // if 204 No Content
  if (res.status === 204) return null
  return parseBody(res)
}

export const api = {
  list: () => request(BASE),
  get: (id) => request(`${BASE}/${id}`),
  create: (body) => request(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id, body) => request(`${BASE}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  remove: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
  filterByPuesto: (puesto) => request(`${BASE}/filtro/puesto?puesto=${encodeURIComponent(puesto)}`),
  filterByEstado: (estado) => request(`${BASE}/filtro/estado?estado=${encodeURIComponent(estado)}`),
  filterBySalarioMayor: (monto) => request(`${BASE}/filtro/salario/mayor?monto=${encodeURIComponent(monto)}`),
  filterBySalarioMenor: (monto) => request(`${BASE}/filtro/salario/menor?monto=${encodeURIComponent(monto)}`),
  estadisticas: () => request(`${BASE}/estadisticas`),
}

export default api
