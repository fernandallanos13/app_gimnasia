import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { aplicarTemaClub } from '../utils/tema'

function Resultados() {
  const [searchParams] = useSearchParams()
  const codigoDesdeUrl = searchParams.get('codigo') || ''

  const [codigoTorneo, setCodigoTorneo] = useState(codigoDesdeUrl)
  const [codigoConfirmado, setCodigoConfirmado] = useState(codigoDesdeUrl)
  const [errorCodigo, setErrorCodigo] = useState('')

  const [torneo, setTorneo] = useState(null)
  const [podios, setPodios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({})
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [estadosResultados, setEstadosResultados] = useState({})

  function esMiniatura(categoria) {
    const texto = String(categoria || '').toLowerCase().trim()
    return texto.includes('miniatura')
  }

  function mostrarPuntaje(valor, categoria) {
    if (esMiniatura(categoria)) {
      return Number(valor) > 0 ? '🙂' : ''
    }

    return valor || ''
  }

  function mostrarTotal(g, categoria) {
    if (esMiniatura(categoria)) {
      return '🙂'
    }

    return Number(g.total || 0).toFixed(2)
  }

  function obtenerPosicionPorPuntaje(lista, puntaje) {
    const puntajesMayores = new Set(
      lista
        .map((item) => Number(item.total || 0))
        .filter((total) => total > puntaje)
    )

    return puntajesMayores.size + 1
  }

  function calcularPuestoPorCortes(gimnasta, lista, puestos) {
    const puntaje = Number(gimnasta.total || 0)
    const total = lista.length

    for (let i = 0; i < puestos.length - 1; i++) {
      const corte = Math.ceil((total * (i + 1)) / puestos.length)
      const puntajeCorte = Number(lista[corte - 1]?.total || 0)

      if (puntaje >= puntajeCorte) {
        return puestos[i]
      }
    }

    return puestos[puestos.length - 1]
  }

  function calcularPuestos(lista, categoria, nivel) {
    const ordenados = [...lista]
      .filter((g) => Number(g.total || 0) > 0)
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))

    if (esMiniatura(categoria)) {
      return ordenados.map((g) => ({
        ...g,
        puesto: '🙂'
      }))
    }

    const nivelTexto = String(nivel || '').toUpperCase().trim()

    return ordenados.map((g) => {
      const puntaje = Number(g.total || 0)
      const posicionPorPuntaje = obtenerPosicionPorPuntaje(ordenados, puntaje)

      if (nivelTexto === 'N1') {
        return {
          ...g,
          puesto: calcularPuestoPorCortes(g, ordenados, ['1°', '2°', '3°'])
        }
      }

      if (nivelTexto === 'N2' || nivelTexto === 'N3') {
        if (posicionPorPuntaje <= 6) {
          return {
            ...g,
            puesto: `${posicionPorPuntaje}°`
          }
        }

        const resto = ordenados.filter((item) => {
          const p = Number(item.total || 0)
          return obtenerPosicionPorPuntaje(ordenados, p) > 6
        })

        return {
          ...g,
          puesto: calcularPuestoPorCortes(g, resto, ['7°', '8°', '9°', '10°'])
        }
      }

      return {
        ...g,
        puesto: `${posicionPorPuntaje}°`
      }
    })
  }

  function colorEstadoResultado(estado) {
    if (estado === 'finalizado') return '#19eb19'
    if (estado === 'cargando') return '#f77f00'
    return '#d62828'
  }

  function textoEstadoResultado(estado) {
    if (estado === 'finalizado') return 'Resultados publicados'
    if (estado === 'cargando') return 'En competencia'
    return 'Resultados pendientes'
  }

  function toggleCategoria(clave) {
    setCategoriasAbiertas((actuales) => ({
      ...actuales,
      [clave]: !actuales[clave]
    }))
  }

  function numeroNivel(nivel) {
    const match = String(nivel || '').match(/\d+/)
    return match ? Number(match[0]) : 999
  }

  async function obtenerResultados() {
    if (!codigoConfirmado) {
      setCargando(false)
      return
    }

    setCargando(true)

    try {
      const { data: torneoData, error: torneoError } = await supabase
        .from('torneos')
        .select('*, clubes ( nombre, color_primario, color_secundario, logo_url )')
        .ilike('codigo', codigoConfirmado.trim())
        .eq('estado', 'activo')
        .single()

      if (torneoError || !torneoData) {
        console.log(torneoError)
        setErrorCodigo('Código de torneo incorrecto o torneo no activo.')
        setCargando(false)
        return
      }

      const torneoId = torneoData.id

      setTorneo(torneoData)
      aplicarTemaClub(torneoData.clubes)

      if (!torneoData.resultados_publicos) {
        setCargando(false)
        return
      }

      const { data: inscripcionesData, error: inscripcionesError } = await supabase
        .from('inscripciones')
        .select(`
          gimnastas (
            id,
            nombre,
            apellido,
            club,
            niveles (nombre),
            categorias (nombre)
          )
        `)
        .eq('torneo_id', torneoId)

      const { data: estadosData, error: estadosError } = await supabase
        .from('estados_resultados')
        .select('*')

      if (inscripcionesError || estadosError) {
        console.log(inscripcionesError || estadosError)
        setCargando(false)
        return
      }

      const mapaEstados = {}

      ;(estadosData || []).forEach((estado) => {
        mapaEstados[`${estado.nivel} - ${estado.categoria}`] = estado.estado
      })

      setEstadosResultados(mapaEstados)

      const agrupados = {}

      ;(inscripcionesData || []).forEach((item) => {
        const gimnasta = item.gimnastas
        if (!gimnasta) return

        agrupados[gimnasta.id] = {
          id: gimnasta.id,
          nombre: `${gimnasta.apellido}, ${gimnasta.nombre}`,
          club: gimnasta.club || '',
          nivel: gimnasta.niveles?.nombre || '',
          categoria: gimnasta.categorias?.nombre || '',
          Suelo: 0,
          Salto: 0,
          Viga: 0,
          Paralelas: 0,
          total: 0,
          puesto: ''
        }
      })

      // Solo pedimos puntajes de las categorías que el admin ya publicó.
      // Así la pantalla pública no descarga puntajes pendientes.
      const idsPublicados = Object.values(agrupados)
        .filter((g) => {
          const claveEstado = `${g.nivel} - ${g.categoria}`
          return mapaEstados[claveEstado] === 'finalizado'
        })
        .map((g) => g.id)

      let puntajesData = []

      if (idsPublicados.length > 0) {
        const { data, error: puntajesError } = await supabase
          .from('puntajes')
          .select(`
            puntaje,
            gimnasta_id,
            aparatos (nombre)
          `)
          .eq('torneo_id', torneoId)
          .in('gimnasta_id', idsPublicados)

        if (puntajesError) {
          console.log(puntajesError)
          setCargando(false)
          return
        }

        puntajesData = data || []
      }

      ;(puntajesData || []).forEach((item) => {
        const aparato = item.aparatos?.nombre
        const gimnastaId = item.gimnasta_id

        if (!gimnastaId || !aparato) return
        if (!agrupados[gimnastaId]) return

        agrupados[gimnastaId][aparato] = Number(item.puntaje)
        agrupados[gimnastaId].total = Number(
          (
            agrupados[gimnastaId].total +
            Number(item.puntaje)
          ).toFixed(2)
        )
      })

      const grupos = {}

      Object.values(agrupados).forEach((g) => {
        const clave = `${g.nivel}|||${g.categoria}`

        if (!grupos[clave]) {
          grupos[clave] = []
        }

        grupos[clave].push(g)
      })

      const podiosCalculados = Object.entries(grupos).map(([clave, gimnastas]) => {
        const [nivel, categoria] = clave.split('|||')
        const claveEstado = `${nivel} - ${categoria}`
        const publicado = mapaEstados[claveEstado] === 'finalizado'

        if (!publicado) {
          return {
            clave,
            nivel,
            categoria,
            gimnastas: [...gimnastas].sort((a, b) =>
              a.nombre.localeCompare(b.nombre, 'es')
            )
          }
        }

        const conPuestos = calcularPuestos(gimnastas, categoria, nivel)
        const mapaPuestos = new Map(
          conPuestos.map((g) => [g.id, g.puesto])
        )

        return {
          clave,
          nivel,
          categoria,
          gimnastas: [...gimnastas]
            .map((g) => ({
              ...g,
              puesto: mapaPuestos.get(g.id) || ''
            }))
            .sort((a, b) => {
              const totalA = Number(a.total || 0)
              const totalB = Number(b.total || 0)

              if (totalA !== totalB) return totalB - totalA
              return a.nombre.localeCompare(b.nombre, 'es')
            })
        }
      })

      setPodios(podiosCalculados)
      setUltimaActualizacion(new Date())
      setCargando(false)
    } catch (err) {
      console.log('Error inesperado obteniendo resultados:', err)
      setErrorCodigo('Ocurrió un error inesperado: ' + err.message)
      setCargando(false)
    }
  }

  useEffect(() => {
    obtenerResultados()

    const canal = supabase
      .channel('resultados-en-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puntajes' }, () => obtenerResultados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estados_resultados' }, () => obtenerResultados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscripciones' }, () => obtenerResultados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gimnastas' }, () => obtenerResultados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneos' }, () => obtenerResultados())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [codigoConfirmado])

  function confirmarCodigo() {
    if (!codigoTorneo.trim()) {
      setErrorCodigo('Escribí el código del torneo.')
      return
    }

    setErrorCodigo('')
    setCodigoConfirmado(codigoTorneo.trim())
  }

  const podiosFiltrados = podios
    .map((grupo) => {
      const gimnastasFiltradas = grupo.gimnastas.filter((g) => {
        const texto = `${g.nombre} ${g.club}`.toLowerCase()
        return texto.includes(busqueda.toLowerCase())
      })

      return {
        ...grupo,
        gimnastas: gimnastasFiltradas
      }
    })
    .filter((grupo) => grupo.gimnastas.length > 0)
    .sort((a, b) => {
      const nivelA = numeroNivel(a.nivel)
      const nivelB = numeroNivel(b.nivel)

      if (nivelA !== nivelB) {
        return nivelA - nivelB
      }

      return String(a.categoria || '').localeCompare(String(b.categoria || ''))
    })

  if (!codigoConfirmado) {
    return (
      <div className="container">
        <h1>Ver resultados</h1>

        <div className="card" style={{ maxWidth: '380px' }}>
          <p style={{ marginBottom: '14px' }}>
            Ingresá el código del torneo que te pasó el club.
          </p>

          <input
            type="text"
            placeholder="Código de torneo"
            value={codigoTorneo}
            onChange={(e) => setCodigoTorneo(e.target.value)}
          />

          {errorCodigo && (
            <p style={{ color: '#b00020', marginTop: '10px' }}>
              {errorCodigo}
            </p>
          )}

          <button onClick={confirmarCodigo} style={{ marginTop: '14px' }}>
            Ver resultados
          </button>
        </div>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="container">
        <h1>Cargando resultados...</h1>
      </div>
    )
  }

  if (!torneo) {
    return (
      <div className="container">
        <h1>Código de torneo incorrecto</h1>
        <p>{errorCodigo}</p>
        <button
          onClick={() => {
            setCodigoConfirmado('')
            setCodigoTorneo('')
          }}
        >
          Probar de nuevo
        </button>
      </div>
    )
  }

  if (!torneo.resultados_publicos) {
    return (
      <div className="container">
        <h1>Resultados no publicados</h1>
        <p>El administrador todavía no habilitó los resultados en vivo.</p>
      </div>
    )
  }

  return (
    <div className="container">
      <div
        style={
          torneo.clubes
            ? {
                width: '100%',
                background: `linear-gradient(135deg, ${torneo.clubes.color_primario || '#151515'}, ${torneo.clubes.color_secundario || '#151515'})`,
                borderRadius: '18px',
                padding: '20px',
                marginBottom: '8px',
                color: 'white'
              }
            : { width: '100%' }
        }
      >
        {torneo.clubes?.logo_url && (
          <img
            src={torneo.clubes.logo_url}
            alt={torneo.clubes.nombre}
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              marginBottom: '8px',
              borderRadius: '10px',
              background: 'white',
              padding: '5px'
            }}
          />
        )}

        <h1 style={torneo.clubes ? { color: 'white' } : undefined}>
          {torneo.nombre}
          {torneo.clubes?.nombre ? ` — ${torneo.clubes.nombre}` : ''}
        </h1>

        {torneo.fecha && (
          <p style={{ fontWeight: 'bold', opacity: 0.95 }}>
            {new Date(torneo.fecha + 'T00:00:00').toLocaleDateString(
              'es-AR',
              { day: 'numeric', month: 'long', year: 'numeric' }
            )}
          </p>
        )}
      </div>

      <p>
        Las categorías y gimnastas pueden consultarse durante el torneo.
        Los puntajes y puestos se publican después de la premiación.
      </p>

      <p className="live-status">
        🟢 EN VIVO
        {ultimaActualizacion && (
          <>
            {' '}· Actualizado a las{' '}
            {ultimaActualizacion.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </>
        )}
      </p>

      <div className="results-search-box">
        <input
          type="text"
          placeholder="Buscar gimnasta por nombre, apellido o club..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {podiosFiltrados.map((grupo) => {
        const abierta = busqueda.trim()
          ? true
          : categoriasAbiertas[grupo.clave]

        const claveEstado = `${grupo.nivel} - ${grupo.categoria}`
        const estadoActual = estadosResultados[claveEstado] || 'pendiente'
        const publicado = estadoActual === 'finalizado'
        const colorEstado = colorEstadoResultado(estadoActual)

        return (
          <div
            key={grupo.clave}
            className="result-category-card"
            style={{ borderLeft: `12px solid ${colorEstado}` }}
          >
            <button
              className="result-category-header"
              onClick={() => toggleCategoria(grupo.clave)}
            >
              <span>{abierta ? '−' : '+'}</span>

              <strong>
                {grupo.nivel} - {grupo.categoria}
              </strong>

              <small>
                {grupo.gimnastas.length} gimnasta(s) · {textoEstadoResultado(estadoActual)}
              </small>
            </button>

            {abierta && (
              publicado ? (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Puesto</th>
                        <th>Gimnasta</th>
                        <th>Club</th>
                        <th>Suelo</th>
                        <th>Salto</th>
                        <th>Viga</th>
                        <th>Paralelas</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {grupo.gimnastas.map((g) => (
                        <tr key={g.id}>
                          <td>
                            <strong>{g.puesto}</strong>
                          </td>
                          <td>{g.nombre}</td>
                          <td>{g.club}</td>
                          <td>{mostrarPuntaje(g.Suelo, grupo.categoria)}</td>
                          <td>{mostrarPuntaje(g.Salto, grupo.categoria)}</td>
                          <td>{mostrarPuntaje(g.Viga, grupo.categoria)}</td>
                          <td>{mostrarPuntaje(g.Paralelas, grupo.categoria)}</td>
                          <td>
                            <strong>{mostrarTotal(g, grupo.categoria)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '12px 10px 16px' }}>
                  <p style={{ marginTop: 0, fontWeight: 600 }}>
                    🔒 Los puntajes y puestos se publicarán después de la premiación.
                  </p>

                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Gimnasta</th>
                          <th>Club</th>
                        </tr>
                      </thead>

                      <tbody>
                        {grupo.gimnastas.map((g) => (
                          <tr key={g.id}>
                            <td>{g.nombre}</td>
                            <td>{g.club}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )
      })}

      {podiosFiltrados.length === 0 && (
        <p>No se encontraron gimnastas con esa búsqueda.</p>
      )}
    </div>
  )
}

export default Resultados
