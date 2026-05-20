import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function Resultados() {
  
  const [torneo, setTorneo] = useState(null)
  const [resultados, setResultados] = useState([])
  const [podios, setPodios] = useState([])
  const [cargando, setCargando] = useState(true)

  function calcularPuestos(lista, tipo) {
    const ordenados = [...lista].sort((a, b) => b.total - a.total)

    if (tipo === 'participativo') {
      return ordenados.map((g, index) => ({
        ...g,
        puesto: index % 3 === 0 ? ':)' : index % 3 === 1 ? ':|' : ':('
      }))
    }

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
      console.log(puntajesError || reglasError)
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

      if (!agrupados[gimnasta.id]) {
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
      }

      agrupados[gimnasta.id][aparato] = Number(item.puntaje)
      agrupados[gimnasta.id].total += Number(item.puntaje)
    })

    const resultadosFinales = Object.values(agrupados)
    setResultados(resultadosFinales)

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
        nivel,
        categoria,
        tipo,
        gimnastas: calcularPuestos(gimnastas, tipo)
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

      <h2 style={{ marginTop: '30px' }}>Tabla general</h2>

      <div style={{ overflowX: 'auto', marginTop: '20px', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr>
              <th>Gimnasta</th>
              <th>Club</th>
              <th>Nivel</th>
              <th>Categoría</th>
              <th>Suelo</th>
              <th>Salto</th>
              <th>Viga</th>
              <th>Paralelas</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map((r) => (
              <tr key={r.id}>
                <td>{r.nombre}</td>
                <td>{r.club}</td>
                <td>{r.nivel}</td>
                <td>{r.categoria}</td>
                <td>{r.Suelo}</td>
                <td>{r.Salto}</td>
                <td>{r.Viga}</td>
                <td>{r.Paralelas}</td>
                <td><strong>{r.total}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '40px' }}>Podios</h2>

      {podios.map((grupo) => (
        <div
          key={`${grupo.nivel}-${grupo.categoria}`}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '14px',
            marginTop: '20px',
            width: '100%'
          }}
        >
          <h3>{grupo.nivel} - {grupo.categoria}</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    <td>{g.Suelo}</td>
                    <td>{g.Salto}</td>
                    <td>{g.Viga}</td>
                    <td>{g.Paralelas}</td>
                    <td><strong>{g.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Resultados