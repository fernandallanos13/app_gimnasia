import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { aplicarTemaClub } from '../utils/tema'

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
    .replace(/[;,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function Inscripcion() {
  const [searchParams] = useSearchParams()
  const codigoDesdeUrl = searchParams.get('codigo') || ''

  const [codigoTorneo, setCodigoTorneo] = useState(codigoDesdeUrl)
  const [torneo, setTorneo] = useState(null)
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState('')

  const [club, setClub] = useState('')
  const [profeResponsable, setProfeResponsable] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [listado, setListado] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [finalizado, setFinalizado] = useState(false)

  const [grupos, setGrupos] = useState([])
  const [grupoEditandoIndex, setGrupoEditandoIndex] = useState(null)

  async function verificarCodigo() {
    if (!codigoTorneo.trim()) {
      setErrorCodigo('Escribí el código del torneo.')
      return
    }

    setVerificandoCodigo(true)
    setErrorCodigo('')

    const { data: torneoEncontrado, error } = await supabase
      .from('torneos')
      .select('*, clubes ( nombre, color_primario, color_secundario, logo_url )')
      .ilike('codigo', codigoTorneo.trim())
      .eq('estado', 'activo')
      .single()

    setVerificandoCodigo(false)

    if (error || !torneoEncontrado) {
      setErrorCodigo('Código de torneo incorrecto o torneo no activo.')
      return
    }

    setTorneo(torneoEncontrado)
    aplicarTemaClub(torneoEncontrado.clubes)
  }

  useEffect(() => {
    if (codigoDesdeUrl) {
      verificarCodigo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nivelSeleccionado = NIVELES.find(
    (n) => String(n.id) === String(nivelId)
  )

  const categoriaSeleccionada = CATEGORIAS.find(
    (c) => String(c.id) === String(categoriaId)
  )

  const gimnastas = useMemo(() => {
    const nombres = listado
      .split('\n')
      .map(limpiarNombre)
      .filter((nombre) => nombre.length > 0)

    return [...new Set(nombres)]
  }, [listado])

  function agregarGrupo() {
    setMensaje('')

    if (!club.trim()) {
      setMensaje('Escribí el club.')
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
      setMensaje('Escribí al menos una gimnasta.')
      return
    }

    const grupoRepetido = grupos.some(
  (grupo, index) =>
    index !== grupoEditandoIndex &&
    Number(grupo.nivel_id) === Number(nivelId) &&
    Number(grupo.categoria_id) === Number(categoriaId)
)


if (grupoRepetido) {
  setMensaje('Ya cargaste ese nivel y esa categoría. Si querés modificar algún dato, hacelo desplegando el nivel y categoría en el RESUMEN DE CARGA.')
  return
}

    const nuevoGrupo = {
      nivel_id: Number(nivelId),
      nivel: nivelSeleccionado?.nombre || '',
      categoria_id: Number(categoriaId),
      categoria: categoriaSeleccionada?.nombre || '',
      gimnastas
    }

    if (grupoEditandoIndex !== null) {
  setGrupos((prev) =>
    prev.map((grupo, index) =>
      index === grupoEditandoIndex ? nuevoGrupo : grupo
    )
  )
  setGrupoEditandoIndex(null)
} else {
  setGrupos((prev) => [...prev, nuevoGrupo])
}

setNivelId('')
setCategoriaId('')
setListado('')
setMensaje('')
}
  
const totalGeneral = grupos.reduce(
    (acc, grupo) => acc + grupo.gimnastas.length,
    0
  )

  const resumenPorNivel = useMemo(() => {
    const resumen = {}

    grupos.forEach((grupo) => {
      if (!resumen[grupo.nivel]) {
        resumen[grupo.nivel] = 0
      }

      resumen[grupo.nivel] += grupo.gimnastas.length
    })

    return resumen
  }, [grupos])

  function editarGrupo(index) {
  const grupo = grupos[index]

  setNivelId(String(grupo.nivel_id))
  setCategoriaId(String(grupo.categoria_id))
  setListado(grupo.gimnastas.join('\n'))
  setGrupoEditandoIndex(index)
  setMensaje('Estás editando un grupo. Cuando termines, tocá “Guardar cambios del grupo”.')

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

  async function finalizarCarga() {
    if (grupos.length === 0) {
      setMensaje('Primero agregá al menos un grupo.')
      return
    }

    setGuardando(true)
    setMensaje('')

    const registros = []

    grupos.forEach((grupo) => {
      grupo.gimnastas.forEach((nombreCompleto) => {
        registros.push({
          torneo_id: torneo.id,
          club: club.trim().replace(/\s+/g, ' ').toUpperCase(),
          profe_responsable: profeResponsable
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase(),
          nivel_id: grupo.nivel_id,
          nivel: grupo.nivel,
          categoria_id: grupo.categoria_id,
          categoria: grupo.categoria,
          nombre_completo: nombreCompleto,
          estado: 'pendiente'
        })
      })
    })

    const { error } = await supabase
      .from('pre_inscripciones')
      .insert(registros)

    setGuardando(false)

    if (error) {
      console.error(error)
      setMensaje('Error al guardar la inscripción.')
      return
    }

    setFinalizado(true)
  }

  function nuevaCarga() {
    setClub('')
    setProfeResponsable('')
    setNivelId('')
    setCategoriaId('')
    setListado('')
    setMensaje('')
    setGuardando(false)
    setFinalizado(false)
    setGrupos([])
  }

  return (
    <div className="inscripcion-page">

      <header
        className="inscripcion-header"
        style={
          torneo?.clubes
            ? {
                background: `linear-gradient(135deg, ${torneo.clubes.color_primario || '#151515'}, ${torneo.clubes.color_secundario || '#151515'})`
              }
            : undefined
        }
      >
        {torneo?.clubes?.logo_url && (
          <img
            src={torneo.clubes.logo_url}
            alt={torneo.clubes.nombre}
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              marginBottom: '10px',
              borderRadius: '12px',
              background: 'white',
              padding: '6px'
            }}
          />
        )}

        <h1>
          Inscripción de Gimnastas
          {torneo?.clubes?.nombre ? ` — ${torneo.clubes.nombre}` : ''}
        </h1>

        {torneo?.nombre && (
          <p style={{ fontSize: '17px', fontWeight: 'bold' }}>
            {torneo.nombre}
            {torneo.fecha && (
              <>
                {' · '}
                {new Date(torneo.fecha + 'T00:00:00').toLocaleDateString(
                  'es-AR',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </>
            )}
          </p>
        )}
      </header>

      <main className="inscripcion-layout">

        {!torneo && (
          <section className="inscripcion-card" style={{ maxWidth: '420px', margin: '0 auto' }}>
            <h2>Ingresá el código del torneo</h2>
            <p className="helper-text">
              Te lo tiene que haber pasado el club organizador.
            </p>

            <input
              type="text"
              placeholder="Código de torneo"
              value={codigoTorneo}
              onChange={(e) => setCodigoTorneo(e.target.value)}
            />

            {errorCodigo && (
              <p className="inscripcion-error">{errorCodigo}</p>
            )}

            <button
              className="primary-btn"
              onClick={verificarCodigo}
              disabled={verificandoCodigo}
            >
              {verificandoCodigo ? 'Verificando...' : 'Continuar'}
            </button>
          </section>
        )}

        {torneo && !finalizado && (
          <>

            <section className="inscripcion-card">

              <h2>Datos generales</h2>

              <label>
                Club

                <input
                  type="text"
                  placeholder="Club que estoy inscribiendo"
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                />
              </label>

              <label>
                Profe responsable

                <input
                  type="text"
                  placeholder="Nombre de la profe responsable"
                  value={profeResponsable}
                  onChange={(e) => setProfeResponsable(e.target.value)}
                />
              </label>

              <label>
                Nivel

                <select
                  value={nivelId}
                  onChange={(e) => setNivelId(e.target.value)}
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

  <p>
    Una gimnasta por línea.
    No uses números ni comas.
  </p>

  <p>
    Podés escribir en MAYÚSCULAS o minúsculas.
    El sistema lo acomoda automáticamente.
  </p>

  <div className="ejemplo-box">
    <strong>Ejemplo correcto:</strong>

    <p>
      Juana Pérez
      <br />
      Martina Gómez
      <br />
      Sofía del Valle Gómez
    </p>
  </div>

  <div className="Nombre y Apellido">
  <p><br/> NOMBRE Y APELLIDO <br/></p>
  </div>
</div>

              <textarea
                value={listado}
                onChange={(e) => setListado(e.target.value)}
                rows={10}
                placeholder="Escribí acá el listado"
              />

              {mensaje && (
                <p className="inscripcion-error">
                  {mensaje}
                </p>
              )}

              <button
                className="primary-btn"
                onClick={agregarGrupo}
              >
                {grupoEditandoIndex !== null ? 'Guardar cambios del grupo' : '+ Agregar grupo'}
              </button>

            </section>

            <section className="inscripcion-card">

              <h2>Resumen de carga</h2>
              <p className="helper-text">
  Haciendo clic en cada grupo verás la lista completa de gimnastas.
</p>

              <div className="resumen-box">
                <p>
                  <strong>Club:</strong>{' '}
                  {club || '-'}
                </p>

                <p>
                  <strong>Profe:</strong>{' '}
                  {profeResponsable || '-'}
                </p>
              </div>

              {grupos.length === 0 ? (
                <p style={{ marginTop: '20px' }}>
                  Todavía no cargaste grupos.
                </p>
              ) : (
                <>
                  <div className="grupos-lista">

                    {grupos.map((grupo, index) => (
  <details key={index} className="grupo-item">
    <summary>
      <strong>{grupo.nivel} · {grupo.categoria}</strong>
      <span>{grupo.gimnastas.length} gimnastas</span>
    </summary>

    <ol className="grupo-nombres">
      {grupo.gimnastas.map((nombre) => (
        <li key={nombre}>{nombre}</li>
      ))}
    </ol>

    <button
  className="secondary-mini-btn"
  onClick={() => editarGrupo(index)}
>
  Editar grupo
</button>
  </details>
))}

                  </div>

                  <div className="totales-box">

                    <h3>Totales por nivel</h3>

                    {Object.entries(resumenPorNivel).map(
                      ([nivel, total]) => (
                        <p key={nivel}>
                          <strong>{nivel}:</strong> {total}
                        </p>
                      )
                    )}

                    <hr />

                    <p className="total-general">
                      TOTAL GENERAL: {totalGeneral}
                    </p>

                  </div>

                  <button
                    className="primary-btn"
                    onClick={finalizarCarga}
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Guardando...'
                      : 'Finalizar carga completa'}
                  </button>

                </>
              )}

            </section>

          </>
        )}

        {finalizado && (
          <section className="inscripcion-card success-card">

            <div className="success-icon">
              ✓
            </div>

            <h2>¡Inscripción enviada!</h2>

            <p>
              Se guardaron {totalGeneral} gimnastas correctamente.
            </p>

            <button
              className="primary-btn"
              onClick={nuevaCarga}
            >
              Nueva inscripción
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
          border-bottom: 5px solid var(--color-primario);
          text-align: center;
        }

        .inscripcion-header h1 {
          color: white;
          margin-bottom: 8px;
        }

        .inscripcion-layout {
          width: min(1200px, calc(100% - 24px));
          margin: 24px auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 22px;
        }

        .inscripcion-card {
          background: white;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 12px 28px rgba(0,0,0,.10);
        }

        label {
          display: block;
          font-weight: 800;
          margin-top: 16px;
        }

        input,
        select,
        textarea {
          width: 100%;
          margin-top: 8px;
          border: 1px solid #ccc;
          border-radius: 14px;
          padding: 13px;
          font-size: 16px;
        }

        textarea {
          resize: vertical;
          min-height: 200px;
        }

        .listado-head {
          margin-top: 20px;
        }

        .listado-head h3 {
          color: var(--color-primario);
        }

        .ejemplo-box {
  background: #f6f6f6;
  border-left: 5px solid var(--color-primario);
  border-radius: 14px;
  padding: 12px 14px;
  margin-top: 14px;
  color: #333;
}

.ejemplo-box p {
  margin-top: 6px;
  line-height: 1.5;
}

        .primary-btn {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 15px;
          margin-top: 20px;
          background: var(--color-primario);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .primary-btn:hover {
          background: #a70f1a;
        }

        .resumen-box {
          background: #f7e7e8;
          border: 1px solid #f0c9cc;
          border-radius: 16px;
          padding: 16px;
          line-height: 1.8;
        }

        .grupo-item {
          background: #f6f6f6;
          border-radius: 14px;
          padding: 14px;
          margin-top: 14px;
        }

        .grupo-item h3 {
          margin: 0;
          color: var(--color-primario);
        }

        .grupo-item p {
          margin-top: 6px;
          font-weight: 700;
        }

        .grupo-item summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.grupo-item summary span {
  font-weight: 800;
  color: #333;
}

.grupo-nombres {
  margin-top: 12px;
  padding-left: 22px;
  line-height: 1.7;
  font-weight: 700;
}

.danger-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 11px;
  margin-top: 12px;
  background: #333;
  color: white;
  font-weight: 900;
  cursor: pointer;
}

        .totales-box {
          margin-top: 24px;
          background: #fff5f5;
          border-radius: 16px;
          padding: 18px;
        }

        .total-general {
          font-size: 20px;
          font-weight: 900;
          color: var(--color-primario);
        }

        .success-card {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }

        .success-icon {
          width: 90px;
          height: 90px;
          border-radius: 999px;
          background: #18a34a;
          color: white;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          font-size: 50px;
          font-weight: 900;
        }

        .inscripcion-error {
          background: #fff0f1;
          color: #9b0d17;
          border: 1px solid #f1b9be;
          border-radius: 12px;
          padding: 12px;
          margin-top: 14px;
          font-weight: 800;
        }

        

        .helper-text {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  margin-bottom: 18px;
}

.secondary-mini-btn {
  width: 100%;
  border: 2px solid var(--color-primario);
  border-radius: 12px;
  padding: 11px;
  margin-top: 12px;
  background: white;
  color: var(--color-primario);
  font-weight: 900;
  cursor: pointer;
}

        @media (max-width: 700px) {
          .inscripcion-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </div>
  )
}

export default Inscripcion