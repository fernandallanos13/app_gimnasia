import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Resultados() {
  const [torneo, setTorneo] = useState(null)
  const [podios, setPodios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({})
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)

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

  return g.total
}

function calcularPuestos(lista, categoria, nivel) {
  const ordenados = [...lista].sort((a, b) => b.total - a.total)

  if (esMiniatura(categoria)) {
    return ordenados.map((g) => ({
      ...g,
      puesto: '🙂'
    }))
  }

    const nivelTexto = String(nivel || '').toUpperCase().trim()

    if (nivelTexto === 'N1') {
      const tercio = Math.ceil(ordenados.length / 3)

      return ordenados.map((g, index) => ({
        ...g,
        puesto:
          index < tercio
            ? '1°'
            : index < tercio * 2
              ? '2°'
              : '3°'
      }))
    }

    if (nivelTexto === 'N2' || nivelTexto === 'N3') {
      return ordenados.map((g, index) => {
        if (index < 6) {
          return {
            ...g,
            puesto: `${index + 1}°`
          }
        }

        const restantes = ordenados.length - 6
        const posicionRestante = index - 6
        const cuarto = Math.ceil(restantes / 4)

        let puesto = '10°'

        if (posicionRestante < cuarto) {
          puesto = '7°'
        } else if (posicionRestante < cuarto * 2) {
          puesto = '8°'
        } else if (posicionRestante < cuarto * 3) {
          puesto = '9°'
        }

        return {
          ...g,
          puesto
        }
      })
    }

    return ordenados.map((g, index) => ({
      ...g,
      puesto: `${index + 1}°`
    }))
  }

  function toggleCategoria(clave) {
    setCategoriasAbiertas({
      ...categoriasAbiertas,
      [clave]: !categoriasAbiertas[clave]
    })
  }

  function numeroNivel(nivel) {
    const match = String(nivel || '').match(/\d+/)
    return match ? Number(match[0]) : 999
  }

  async function obtenerResultados() {
    setCargando(true)

    const { data: torneoActivo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('*')
      .eq('estado', 'activo')
      .limit(1)
      .single()

    if (errorTorneo || !torneoActivo) {
      console.log(errorTorneo)
      setCargando(false)
      return
    }

    const torneoId = torneoActivo.id

    const { data: torneoData, error: torneoError } = await supabase
      .from('torneos')
      .select('*')
      .eq('id', torneoId)
      .single()

    if (torneoError || !torneoData) {
      console.log(torneoError)
      setCargando(false)
      return
    }

    setTorneo(torneoData)

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

    const { data: puntajesData, error: puntajesError } = await supabase
      .from('puntajes')
      .select(`
        puntaje,
        gimnastas (
          id,
          nombre,
          apellido,
          club,
          niveles (nombre),
          categorias (nombre)
        ),
        aparatos (nombre)
      `)
      .eq('torneo_id', torneoId)

    if (puntajesError || inscripcionesError) {
      console.log(puntajesError || inscripcionesError)
      setCargando(false)
      return
    }

    const agrupados = {}

    inscripcionesData.forEach((item) => {
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
        total: 0
      }
    })

    puntajesData.forEach((item) => {
      const gimnasta = item.gimnastas
      const aparato = item.aparatos?.nombre

      if (!gimnasta || !aparato) return
      if (!agrupados[gimnasta.id]) return

      agrupados[gimnasta.id][aparato] = Number(item.puntaje)
      agrupados[gimnasta.id].total += Number(item.puntaje)
    })

    const resultadosFinales = Object.values(agrupados)
    const grupos = {}

    resultadosFinales.forEach((g) => {
      const clave = `${g.nivel}|||${g.categoria}`

      if (!grupos[clave]) {
        grupos[clave] = []
      }

      grupos[clave].push(g)
    })

    const podiosCalculados = Object.entries(grupos).map(([clave, gimnastas]) => {
      const [nivel, categoria] = clave.split('|||')

      return {
        clave,
        nivel,
        categoria,
        gimnastas: calcularPuestos(gimnastas, categoria, nivel)
      }
    })

    setPodios(podiosCalculados)
    setUltimaActualizacion(new Date())
    setCargando(false)
  }

  useEffect(() => {
    obtenerResultados()

    const canal = supabase
      .channel('resultados-en-vivo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'puntajes'
        },
        () => obtenerResultados()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

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
        <h1>Torneo no encontrado</h1>
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
      <h1>{torneo.nombre}</h1>
      <p>Resultados en vivo</p>

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

        return (
          <div key={grupo.clave} className="result-category-card">
            <button
              className="result-category-header"
              onClick={() => toggleCategoria(grupo.clave)}
            >
              <span>{abierta ? '−' : '+'}</span>

              <strong>
                {grupo.nivel} - {grupo.categoria}
              </strong>

              <small>
                {grupo.gimnastas.length} gimnasta(s)
              </small>
            </button>

            {abierta && (
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