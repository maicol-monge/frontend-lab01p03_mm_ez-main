export default function Home() {
  return (
    <div className="page-container">
      <section className="mb-6">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="md:flex">
            <div className="p-6 md:p-10 md:w-2/3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">TecnoGlobal</h1>
              <p className="mt-3 text-slate-600 md:text-lg">Sistema de administración de empleados.</p>

              {/* preserve original credit lines exactly as requested */}
              <div className="mt-4 text-sm text-slate-500">
                <div>2022-MS-651 - Maicol Josué Monge Santamaría</div>
                <div>2022-ZR-650 - Ever Alexander Zamora Ramirez</div>
              </div>

              <div className="mt-6">
                <a href="/empleados" className="btn-primary-tailwind inline-flex items-center justify-center px-5 py-3">Ver Empleados</a>
              </div>
            </div>

            <div className="hidden md:flex md:w-1/3 items-center justify-center bg-slate-50 p-6">
              {/* Decorative vector keeping a professional look */}
              <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto">
                <rect x="8" y="8" width="164" height="164" rx="12" fill="#0ea5e9" fillOpacity="0.08" />
                <g transform="translate(30,30) scale(0.7)">
                  <rect x="6" y="6" width="120" height="28" rx="6" fill="#0ea5e9" fillOpacity="0.12" />
                  <rect x="6" y="46" width="120" height="66" rx="8" fill="#0ea5e9" fillOpacity="0.08" />
                  <circle cx="26" cy="80" r="8" fill="#0ea5e9" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface">
          <h3 className="text-lg font-semibold">Descripción</h3>
          <p className="mt-2 text-sm text-slate-600">Sistema para administrar empleados con validaciones, filtros y reportes básicos.</p>
        </div>
        <div className="card-surface">
          <h3 className="text-lg font-semibold">Acciones</h3>
          <p className="mt-2 text-sm text-slate-600">Crea, edita o elimina registros de empleados. Filtra y exporta datos para análisis.</p>
        </div>
        <div className="card-surface">
          <h3 className="text-lg font-semibold">Contacto</h3>
          <p className="mt-2 text-sm text-slate-600">Proyecto académico - para soporte revisa la documentación interna o contacta a los autores.</p>
        </div>
      </section>
    </div>
  )
}
