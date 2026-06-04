import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'

function AdminPuntajes() {
  const location = useLocation()

  const {
    puntajesCargados = [],
    gimnastasInscriptas = [],
    torneoSeleccionado = null
  } = location.state || {}

  const [busqueda, setBusqueda] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [turnoFiltro, setTurnoFiltro] = useState('')
  const [clubFiltro, setClubFiltro] = useState('')
  const [editando, setEditando] = useState(null)
  const [valoresEditados, setValoresEditados] = useState({})
  const [aparatos, setAparatos] = useState([])
  const [turnosPorGimnasta, setTurnosPorGimnasta] = useState({})

  useEffect(() => {
    obtenerAparatos()
  }, [])

  useEffect(() => {
    if (torneoSeleccionado?.id) {
      obtenerTurnosPorGimnasta(torneoSeleccionado.id)
    }
  }, [torneoSeleccionado?.id])

  async function obtenerAparatos() {
    const { data, error } = await supabase
      .from('aparatos')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.log(error)
      alert('Error al traer aparatos')
      return
    }

    setAparatos(data || [])
  }

  async function obtenerTurnosPorGimnasta(torneoId) {
    const { data: turnosData, error: errorTurnos } = await supabase
      .from('turnos')
      .select('id, nombre')
      .eq('torneo_id', torneoId)
      .order('id', { ascending: true })

    if (errorTurnos) {
      console.log(errorTurnos)
      return
    }

    const turnos = turnosData || []
    const idsTurnos = turnos.map((turno) => turno.id)

    if (idsTurnos.length === 0) {
      setTurnosPorGimnasta({})
      return
    }

    const nombresPorTurno = {}
    turnos.forEach((turno) => {
      nombresPorTurno[turno.id] = turno.nombre
    })

    const { data: relacionesData, error: errorRelaciones } = await supabase
      .from('turno_gimnastas')
      .select('turno_id, gimnasta_id')
      .in('turno_id', idsTurnos)

    if (errorRelaciones) {
      console.log(errorRelaciones)
      return
    }

    const mapa = {}

    ;(relacionesData || []).forEach((relacion) => {
      const gimnastaId = relacion.gimnasta_id
      const nombreTurno = nombresPorTurno[relacion.turno_id]

      if (!gimnastaId || !nombreTurno) return

      if (!mapa[gimnastaId]) mapa[gimnastaId] = []
      if (!mapa[gimnastaId].includes(nombreTurno)) mapa[gimnastaId].push(nombreTurno)
    })

    setTurnosPorGimnasta(mapa)
  }

  const agrupados = {}

  gimnastasInscriptas.forEach((inscripcion) => {
    const g = inscripcion.gimnastas
    if (!g) return

    const clave = `${g.apellido}-${g.nombre}-${g.club}-${g.id}`

    agrupados[clave] = {
      apellido: g.apellido,
      nombre: g.nombre,
      club: g.club || '',
      gimnasta_id: g.id,
      nivel: g.niveles?.nombre || '',
      categoria: g.categorias?.nombre || '',
      turnos: turnosPorGimnasta[g.id] || [],
      Suelo: '',
      Salto: '',
      Viga: '',
      Paralelas: '',
      total: 0,
      puntajesIds: {}
    }
  })

  puntajesCargados.forEach((p) => {
    const g = p.gimnastas
    const aparato = p.aparatos?.nombre

    if (!g || !aparato) return

    const clave = `${g.apellido}-${g.nombre}-${g.club}-${g.id}`

    if (!agrupados[clave]) {
      agrupados[clave] = {
        apellido: g.apellido,
        nombre: g.nombre,
        club: g.club || '',
        gimnasta_id: g.id,
        nivel: g.niveles?.nombre || '',
        categoria: g.categorias?.nombre || '',
        turnos: turnosPorGimnasta[g.id] || [],
        Suelo: '',
        Salto: '',
        Viga: '',
        Paralelas: '',
        total: 0,
        puntajesIds: {}
      }
    }

    agrupados[clave][aparato] = Number(p.puntaje).toFixed(2)
    agrupados[clave].puntajesIds[aparato] = p.id

    agrupados[clave].total = Number(
      (agrupados[clave].total + Number(p.puntaje || 0)).toFixed(2)
    )
  })

  const filasBase = Object.values(agrupados)

  const niveles = useMemo(() => {
    return [...new Set(filasBase.map((g) => g.nivel).filter(Boolean))].sort((a, b) => numeroNivel(a) - numeroNivel(b))
  }, [filasBase])

  const categorias = useMemo(() => {
    return [...new Set(filasBase.map((g) => g.categoria).filter(Boolean))].sort()
  }, [filasBase])

  const clubes = useMemo(() => {
    return [...new Set(filasBase.map((g) => g.club).filter(Boolean))].sort()
  }, [filasBase])

  const turnos = useMemo(() => {
    return [...new Set(filasBase.flatMap((g) => g.turnos || []).filter(Boolean))].sort()
  }, [filasBase])

  const filas = filasBase.filter((g) => {
    const texto = `${g.apellido} ${g.nombre}`.toLowerCase()
    const coincideBusqueda = texto.includes(busqueda.toLowerCase())
    const coincideNivel = nivelFiltro ? g.nivel === nivelFiltro : true
    const coincideCategoria = categoriaFiltro ? g.categoria === categoriaFiltro : true
    const coincideClub = clubFiltro ? g.club === clubFiltro : true
    const coincideTurno = turnoFiltro ? (g.turnos || []).includes(turnoFiltro) : true

    return coincideBusqueda && coincideNivel && coincideCategoria && coincideClub && coincideTurno
  })

  function numeroNivel(nivel) {
    const match = String(nivel || '').match(/\d+/)
    return match ? Number(match[0]) : 999
  }

  function limpiarFiltros() {
    setBusqueda('')
    setNivelFiltro('')
    setCategoriaFiltro('')
    setTurnoFiltro('')
    setClubFiltro('')
  }

  function iniciarEdicion(g) {
    const clave = `${g.apellido}-${g.nombre}-${g.club}-${g.gimnasta_id}`
    setEditando(clave)

    setValoresEditados({
      Suelo: g.Suelo,
      Salto: g.Salto,
      Viga: g.Viga,
      Paralelas: g.Paralelas
    })
  }

  function cancelarEdicion() {
    setEditando(null)
    setValoresEditados({})
  }

  function normalizarNumero(valor) {
    return String(valor || '').replace(',', '.').trim()
  }

  async function obtenerJuezAdmin() {
    const { data: existente, error: errorBuscar } = await supabase
      .from('jueces')
      .select('id')
      .eq('nombre', 'ADMIN')
      .eq('torneo_id', torneoSeleccionado.id)
      .maybeSingle()

    if (errorBuscar) {
      console.log(errorBuscar)
    }

    if (existente) return existente

    const { data: creado, error } = await supabase
      .from('jueces')
      .insert([
        {
          nombre: 'ADMIN',
          torneo_id: torneoSeleccionado.id
        }
      ])
      .select('id')
      .single()

    if (error) {
      console.log(error)
      alert('No se pudo crear/obtener juez ADMIN')
      return null
    }

    return creado
  }

  async function guardarEdicion(g) {
    if (!torneoSeleccionado?.id) {
      alert('No se encontró el torneo activo')
      return
    }

    const juezAdmin = await obtenerJuezAdmin()
    if (!juezAdmin?.id) return

    for (const aparato of aparatos) {
      const nombreAparato = aparato.nombre
      const valorCrudo = valoresEditados[nombreAparato]

      if (valorCrudo === '' || valorCrudo === undefined) continue

      const valorNormalizado = normalizarNumero(valorCrudo)
      const valor = Number(valorNormalizado)

      const regexDecimal = /^\d+(\.\d{0,2})?$/

      if (!regexDecimal.test(valorNormalizado)) {
        alert('Máximo 2 decimales')
        return
      }

      if (Number.isNaN(valor) || valor < 0 || valor > 99) {
        alert('Los puntajes deben estar entre 0 y 99')
        return
      }

      const { error } = await supabase
        .from('puntajes')
        .upsert(
          {
            torneo_id: torneoSeleccionado.id,
            gimnasta_id: g.gimnasta_id,
            aparato_id: aparato.id,
            juez_id: juezAdmin.id,
            puntaje: Number(valor.toFixed(2))
          },
          {
            onConflict: 'torneo_id,gimnasta_id,aparato_id'
          }
        )

      if (error) {
        console.log(error)
        alert(`Error al guardar ${nombreAparato}`)
        return
      }
    }

    alert('Puntajes guardados correctamente. Volvé a entrar para verlos actualizados.')
    setEditando(null)
  }

  return (
    <div className="admin-page">
      <h1>Puntajes cargados</h1>

      <div className="admin-box">
        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="podios-filter-grid">
          <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
            <option value="">Todos los niveles</option>
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>{nivel}</option>
            ))}
          </select>

          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>

          <select value={turnoFiltro} onChange={(e) => setTurnoFiltro(e.target.value)}>
            <option value="">Todos los turnos</option>
            {turnos.map((turno) => (
              <option key={turno} value={turno}>{turno}</option>
            ))}
          </select>

          <select value={clubFiltro} onChange={(e) => setClubFiltro(e.target.value)}>
            <option value="">Todos los clubes</option>
            {clubes.map((club) => (
              <option key={club} value={club}>{club}</option>
            ))}
          </select>

          <button onClick={limpiarFiltros}>Limpiar filtros</button>
        </div>

        <p style={{ marginTop: '12px', fontWeight: 'bold' }}>
          {filas.length} gimnasta(s) encontrada(s)
        </p>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Nivel</th>
                <th>Cat.</th>
                <th>Turno</th>
                <th>Suelo</th>
                <th>Salto</th>
                <th>Viga</th>
                <th>Paral.</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filas.map((g) => {
                const clave = `${g.apellido}-${g.nombre}-${g.club}-${g.gimnasta_id}`
                const estaEditando = editando === clave

                return (
                  <tr key={clave}>
                    <td>{g.apellido}</td>
                    <td>{g.nombre}</td>
                    <td>{g.club}</td>
                    <td>{g.nivel}</td>
                    <td>{g.categoria}</td>
                    <td>{(g.turnos || []).join(', ') || '-'}</td>

                    {['Suelo', 'Salto', 'Viga', 'Paralelas'].map((aparato) => (
                      <td key={aparato}>
                        {estaEditando ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            style={{
                              width: '38px',
                              fontSize: '10px',
                              padding: '1px',
                              textAlign: 'center'
                            }}
                            value={valoresEditados[aparato] || ''}
                            onChange={(e) =>
                              setValoresEditados({
                                ...valoresEditados,
                                [aparato]: e.target.value
                              })
                            }
                          />
                        ) : (
                          g[aparato]
                        )}
                      </td>
                    ))}

                    <td>
                      <strong>
                        {estaEditando
                          ? Number(
                              Object.values(valoresEditados).reduce(
                                (acc, val) =>
                                  acc + Number(normalizarNumero(val) || 0),
                                0
                              )
                            ).toFixed(2)
                          : Number(g.total || 0).toFixed(2)}
                      </strong>
                    </td>

                    <td>
                      {estaEditando ? (
                        <div className="table-buttons">
                          <button onClick={() => guardarEdicion(g)}>
                            Guardar
                          </button>

                          <button className="danger" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => iniciarEdicion(g)}>
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filas.length === 0 && (
          <p style={{ marginTop: '16px' }}>
            No hay gimnastas para mostrar.
          </p>
        )}
      </div>
    </div>
  )
}

export default AdminPuntajes
