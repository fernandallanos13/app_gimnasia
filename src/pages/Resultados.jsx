import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Resultados() {
  const [torneo, setTorneo] = useState(null)
  const [podios, setPodios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({})

  function esMiniaturas(categoria) {
    return categoria === 'Miniaturas'
  }

  function mostrarPuntaje(valor, categoria) {
    if (esMiniaturas(categoria)) {
      return Number(valor) > 0 ? '🙂' : ''
    }

    return valor || ''
  }

  function calcularPuestos(lista, tipo, categoria) {
    if (esMiniaturas(categoria)) {
      return lista.map((g) => ({
        ...g,
        puesto: '🙂'
      }))
    }

    const ordenados = [...lista].sort((a, b) => b.total - a.total)

    if (tipo === 'tercios') {
      const cantidad = ordenados.length
      const tercio = Math.ceil(cantidad / 3)

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

    if (tipo === 'hasta_6_y_grupos') {
      return ordenados.map((g, index) => ({
        ...g,
        puesto: index < 6 ? `${index + 1}°` : `${Math.min(index + 1, 10)}°`
      }))
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

    const { data: reglasData, error: reglasError } = await supabase
      .from('reglas_premiacion')
      .select('*')

    if (puntajesError || reglasError || inscripcionesError) {
      console.log(puntajesError || reglasError || inscripcionesError)
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

      const regla = reglasData.find(
        (r) => r.nivel === nivel && r.categoria === categoria
      )

      const tipo = regla?.tipo || 'ranking_completo'

      return {
        clave,
        nivel,
        categoria,
        tipo,
        gimnastas: calcularPuestos(gimnastas, tipo, categoria)
      }
    })

    setPodios(podiosCalculados)
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

      <div className="results-search-box">
        <input
          type="text"
          placeholder="Buscar gimnasta por nombre, apellido o club..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {podiosFiltrados.map((grupo) => {
        const abierta = categoriasAbiertas[grupo.clave]

        return (
          <div
            key={grupo.clave}
            className="result-category-card"
          >
            <button
              className="result-category-header"
              onClick={() => toggleCategoria(grupo.clave)}
            >
              <span>
                {abierta ? '−' : '+'}
              </span>

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
                        <td><strong>{g.puesto}</strong></td>
                        <td>{g.nombre}</td>
                        <td>{g.club}</td>
                        <td>{mostrarPuntaje(g.Suelo, grupo.categoria)}</td>
                        <td>{mostrarPuntaje(g.Salto, grupo.categoria)}</td>
                        <td>{mostrarPuntaje(g.Viga, grupo.categoria)}</td>
                        <td>{mostrarPuntaje(g.Paralelas, grupo.categoria)}</td>
                        <td>
                          <strong>
                            {esMiniaturas(grupo.categoria) ? '🙂' : g.total}
                          </strong>
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