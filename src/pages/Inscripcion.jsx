import { useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const NIVELES = [
  { id: 4, nombre: 'N1' },
  { id: 5, nombre: 'N2' },
  { id: 6, nombre: 'N3' },
  { id: 7, nombre: 'N4' },
  { id: 8, nombre: 'N5' },
  { id: 14, nombre: 'N3 USAG' },
  { id: 15, nombre: 'N4 USAG' },
  { id: 16, nombre: 'N5 USAG' },
  { id: 17, nombre: 'FEDERADAS' }
]

const CATEGORIAS = [
  { id: 5, nombre: 'Miniatura 3-4-5 Años' },
  { id: 6, nombre: 'Pre-Mini 6-7 Años' },
  { id: 7, nombre: 'Mini 8-9 Años' },
  { id: 8, nombre: 'Pre-Infantil 10-11 Años' },
  { id: 9, nombre: 'Infantil 12-13 Años' },
  { id: 10, nombre: 'Juvenil 14-15 Años' },
  { id: 11, nombre: 'Mayores 16+ Años' }
]

function limpiarNombre(texto) {
  return String(texto || '')
    .replace(/^\s*\d+[.)-]?\s*/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function Inscripcion() {
  const [club, setClub] = useState('')
  const [profeResponsable, setProfeResponsable] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [listado, setListado] = useState('')
  const [paso, setPaso] = useState('formulario')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const nivelSeleccionado = NIVELES.find((n) => String(n.id) === String(nivelId))
  const categoriaSeleccionada = CATEGORIAS.find((c) => String(c.id) === String(categoriaId))

  const gimnastas = useMemo(() => {
    const nombres = listado
      .split('\n')
      .map(limpiarNombre)
      .filter((nombre) => nombre.length > 0)

    return [...new Set(nombres)]
  }, [listado])

  function previsualizar() {
    setMensaje('')

    if (!club.trim()) {
      setMensaje('Escribí el club que estás inscribiendo.')
      return
    }

    if (!profeResponsable.trim()) {
  setMensaje('Escribí la profe responsable.')
  return
}

    if (!nivelId) {
      setMensaje('Seleccioná un nivel.')
      return
    }

    if (!categoriaId) {
      setMensaje('Seleccioná una categoría.')
      return
    }

    if (gimnastas.length === 0) {
      setMensaje('Escribí al menos una gimnasta en el listado.')
      return
    }

    setPaso('preview')
  }

  async function confirmarInscripcion() {
    setGuardando(true)
    setMensaje('')

    const registros = gimnastas.map((nombreCompleto) => ({
      club: club.trim().replace(/\s+/g, ' ').toUpperCase(),
      profe_responsable: profeResponsable.trim().replace(/\s+/g, ' ').toUpperCase(),
      nivel_id: Number(nivelId),
      nivel: nivelSeleccionado?.nombre || '',
      categoria_id: Number(categoriaId),
      categoria: categoriaSeleccionada?.nombre || '',
      nombre_completo: nombreCompleto,
      estado: 'pendiente'
    }))

    const { error } = await supabase
      .from('pre_inscripciones')
      .insert(registros)

    setGuardando(false)

    if (error) {
      console.error('Error al guardar inscripción:', error)
      setMensaje('No se pudo guardar la inscripción. Revisá la conexión o avisale al administrador.')
      return
    }

    setPaso('exito')
  }

  function cargarOtroGrupo() {
    setNivelId('')
    setCategoriaId('')
    setListado('')
    setMensaje('')
    setPaso('formulario')
  }

  function finalizar() {
    setClub('')
    setProfeResponsable('')
    setNivelId('')
    setCategoriaId('')
    setListado('')
    setMensaje('')
    setPaso('formulario')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="inscripcion-page">
      <header className="inscripcion-header">
        <div>
          <p className="inscripcion-kicker">Software Gimnastas</p>
          <h1>Inscripción de gimnastas</h1>
          <p>Completá los datos del grupo y enviá el listado.</p>
        </div>
      </header>

      <main className="inscripcion-layout">
        {(paso === 'formulario' || paso === 'preview') && (
          <section className="inscripcion-card">
            <div className="step-title">
              <span>1</span>
              <h2>Nueva inscripción</h2>
            </div>

            <label>
              Club
              <input
                type="text"
                placeholder="Club que estoy inscribiendo"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                disabled={paso === 'preview'}
              />
            </label>

            <label>
  Profe responsable
  <input
    type="text"
    placeholder="Nombre de la profe responsable"
    value={profeResponsable}
    onChange={(e) => setProfeResponsable(e.target.value)}
    disabled={paso === 'preview'}
  />
</label>

            <label>
              Nivel
              <select
                value={nivelId}
                onChange={(e) => setNivelId(e.target.value)}
                disabled={paso === 'preview'}
              >
                <option value="">Seleccionar nivel</option>
                {NIVELES.map((nivel) => (
                  <option key={nivel.id} value={nivel.id}>
                    {nivel.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Categoría
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={paso === 'preview'}
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="listado-head">
              <h3>Listado de gimnastas</h3>
              <p>Una gimnasta por línea. No uses números ni comas.</p>
            </div>

            <div className="ejemplo-box">
              <strong>Ejemplo de escritura:</strong>
              <p>
                JUANA PÉREZ
                <br />
                MARTINA GÓMEZ
                <br />
                SOFÍA DEL VALLE GÓMEZ
              </p>
            </div>

            <textarea
              value={listado}
              onChange={(e) => setListado(e.target.value)}
              placeholder="Escribí acá el listado real de gimnastas"
              rows={9}
              disabled={paso === 'preview'}
            />

            {mensaje && <p className="inscripcion-error">{mensaje}</p>}

            {paso === 'formulario' && (
              <button className="primary-btn" onClick={previsualizar}>
                Previsualizar inscripción
              </button>
            )}
          </section>
        )}

        {paso === 'preview' && (
          <section className="inscripcion-card preview-card">
            <div className="step-title">
              <span>2</span>
              <h2>Vista previa</h2>
            </div>

            <div className="resumen-box">
              <p>
                <strong>Club:</strong> {club.trim().toUpperCase()}
              </p>
              <p>
  <strong>Profe responsable:</strong> {profeResponsable.trim().toUpperCase()}
</p>
              <p>
                <strong>Nivel:</strong> {nivelSeleccionado?.nombre}
              </p>
              <p>
                <strong>Categoría:</strong> {categoriaSeleccionada?.nombre}
              </p>
            </div>

            <h3 className="detectadas">✓ {gimnastas.length} gimnastas detectadas</h3>

            <ol className="preview-list">
              {gimnastas.map((nombre) => (
                <li key={nombre}>{nombre}</li>
              ))}
            </ol>

            {mensaje && <p className="inscripcion-error">{mensaje}</p>}

            <div className="button-row">
              <button
                className="secondary-btn"
                onClick={() => setPaso('formulario')}
                disabled={guardando}
              >
                Editar
              </button>

              <button
                className="primary-btn"
                onClick={confirmarInscripcion}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Confirmar inscripción'}
              </button>
            </div>
          </section>
        )}

        {paso === 'exito' && (
          <section className="inscripcion-card success-card">
            <div className="success-icon">✓</div>
            <h2>¡Inscripción realizada!</h2>
            <p>El grupo fue guardado correctamente y queda pendiente de revisión.</p>

            <button className="primary-btn" onClick={cargarOtroGrupo}>
              + Cargar otro grupo
            </button>

            <button className="secondary-btn" onClick={finalizar}>
              Finalizar por hoy
            </button>
          </section>
        )}
      </main>

      <style>{`
        .inscripcion-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff 0%, #f4f4f4 48%, #f1d7d9 100%);
          color: #242424;
          padding-bottom: 32px;
        }

        .inscripcion-header {
          background: #151515;
          color: white;
          padding: 24px 18px;
          border-bottom: 5px solid #c1121f;
          text-align: center;
        }

        .inscripcion-kicker {
          color: #ffb3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .inscripcion-header h1 {
          color: white;
          font-size: clamp(28px, 5vw, 44px);
          margin-bottom: 6px;
        }

        .inscripcion-layout {
          width: min(1120px, calc(100% - 28px));
          margin: 26px auto 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
          gap: 22px;
          align-items: start;
        }

        .inscripcion-card {
          background: rgba(255,255,255,.96);
          border: 1px solid #e0e0e0;
          border-radius: 22px;
          box-shadow: 0 14px 32px rgba(0,0,0,.10);
          padding: 22px;
        }

        .step-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .step-title span {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #c1121f;
          color: white;
          display: grid;
          place-items: center;
          font-weight: 900;
          font-size: 20px;
        }

        .step-title h2 {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: .4px;
        }

        .inscripcion-card label {
          display: block;
          font-weight: 800;
          margin: 15px 0 8px;
        }

        .inscripcion-card input,
        .inscripcion-card select,
        .inscripcion-card textarea {
          width: 100%;
          border: 1px solid #cfcfcf;
          border-radius: 14px;
          padding: 13px 14px;
          font-size: 16px;
          background: white;
          margin-top: 8px;
        }

        .inscripcion-card textarea {
          resize: vertical;
          min-height: 180px;
          line-height: 1.55;
          font-weight: 700;
        }

        .listado-head {
          margin-top: 22px;
        }

        .listado-head h3 {
          color: #c1121f;
          text-transform: uppercase;
          font-size: 17px;
          margin-bottom: 6px;
        }

        .listado-head p {
          color: #555;
          font-size: 14px;
        }

        .ejemplo-box {
          background: #f6f6f6;
          border-left: 5px solid #c1121f;
          border-radius: 14px;
          padding: 12px 14px;
          margin: 12px 0;
          color: #333;
        }

        .ejemplo-box p {
          margin-top: 6px;
          line-height: 1.45;
        }

        .primary-btn,
        .secondary-btn {
          width: 100%;
          max-width: none;
          margin-top: 18px;
          border-radius: 14px;
          text-transform: uppercase;
          letter-spacing: .3px;
          border: none;
          padding: 14px 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .primary-btn {
          background: #c1121f;
          color: white;
        }

        .primary-btn:hover {
          background: #a70f1a;
        }

        .secondary-btn {
          background: white;
          color: #c1121f;
          border: 2px solid #c1121f;
        }

        .secondary-btn:hover {
          background: #fff0f1;
        }

        .button-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 12px;
          margin-top: 8px;
        }

        .resumen-box {
          background: #f7e7e8;
          border: 1px solid #f0c9cc;
          border-radius: 16px;
          padding: 16px;
          line-height: 1.8;
        }

        .detectadas {
          margin: 18px 0 12px;
          color: #16813a;
        }

        .preview-list {
          border: 1px solid #ddd;
          border-radius: 16px;
          padding: 16px 16px 16px 42px;
          line-height: 1.85;
          font-weight: 800;
          background: white;
          max-height: 360px;
          overflow: auto;
        }

        .success-card {
          max-width: 520px;
          margin: 0 auto;
          text-align: center;
        }

        .success-icon {
          width: 96px;
          height: 96px;
          margin: 10px auto 18px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #18a34a;
          color: white;
          font-size: 58px;
          font-weight: 900;
        }

        .success-card h2 {
          color: #16813a;
          margin-bottom: 10px;
        }

        .inscripcion-error {
          background: #fff0f1;
          color: #9b0d17;
          border: 1px solid #f1b9be;
          border-radius: 12px;
          padding: 12px;
          margin-top: 12px;
          font-weight: 800;
        }

        button:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none !important;
        }

        @media (max-width: 700px) {
          .inscripcion-layout {
            grid-template-columns: 1fr;
            width: calc(100% - 18px);
            margin-top: 14px;
          }

          .inscripcion-card {
            padding: 16px;
            border-radius: 18px;
          }

          .button-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default Inscripcion