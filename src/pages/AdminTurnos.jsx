import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function AdminTurnos() {
  const location = useLocation()

  const {
    gimnastasInscriptas = [],
    torneoSeleccionado
  } = location.state || {}

  const [nombreTurno, setNombreTurno] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [seleccionadas, setSeleccionadas] = useState([])

  const [turnos, setTurnos] = useState([])

  async function obtenerTurnos() {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('torneo_id', torneoSeleccionado.id)
      .order('id', { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setTurnos(data || [])
  }

  useEffect(() => {
    if (torneoSeleccionado?.id) {
      obtenerTurnos()
    }
  }, [])

  const filtradas = gimnastasInscriptas.filter((inscripcion) => {
    const g = inscripcion.gimnastas

    const texto =
      `${g?.apellido} ${g?.nombre} ${g?.club}`
        .toLowerCase()

    return texto.includes(busqueda.toLowerCase())
  })

  function toggleSeleccion(gimnastaId) {
    setSeleccionadas((prev) => {
      if (prev.includes(gimnastaId)) {
        return prev.filter((id) => id !== gimnastaId)
      }

      return [...prev, gimnastaId]
    })
  }

  async function crearTurno() {
    if (!nombreTurno.trim()) {
      alert('Poné un nombre al turno')
      return
    }

    if (seleccionadas.length === 0) {
      alert('Seleccioná al menos una gimnasta')
      return
    }

    const { data: turnoCreado, error: errorTurno } = await supabase
      .from('turnos')
      .insert([
        {
          torneo_id: torneoSeleccionado.id,
          nombre: nombreTurno.trim()
        }
      ])
      .select()
      .single()

    if (errorTurno) {
      console.log(errorTurno)
      alert('Error al crear turno')
      return
    }

    const registros = seleccionadas.map((gimnastaId) => ({
      turno_id: turnoCreado.id,
      torneo_id: torneoSeleccionado.id,
      gimnasta_id: gimnastaId
    }))

    const { error: errorRelaciones } = await supabase
      .from('turno_gimnastas')
      .insert(registros)

    if (errorRelaciones) {
      console.log(errorRelaciones)
      alert('Turno creado, pero hubo error al asignar gimnastas')
      return
    }

    alert('Turno creado')

    setNombreTurno('')
    setSeleccionadas([])

    obtenerTurnos()
  }

  return (
    <div className="container admin-page">
      <h1>Turnos</h1>

      <div className="admin-box">

        <input
          type="text"
          placeholder="Nombre del turno (Ej: Turno 11 hs)"
          value={nombreTurno}
          onChange={(e) => setNombreTurno(e.target.value)}
        />

        <input
          type="text"
          placeholder="Buscar gimnastas..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <p>
          Seleccionadas: <strong>{seleccionadas.length}</strong>
        </p>

        <button onClick={crearTurno}>
          Crear turno
        </button>

      </div>

      <div className="admin-box">

        <h2>Gimnastas</h2>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Nivel</th>
                <th>Categoría</th>
              </tr>
            </thead>

            <tbody>

              {filtradas.map((inscripcion) => {

                const g = inscripcion.gimnastas

                return (
                  <tr key={g.id}>

                    <td>
                      <input
                        type="checkbox"
                        checked={seleccionadas.includes(g.id)}
                        onChange={() => toggleSeleccion(g.id)}
                      />
                    </td>

                    <td>{g.apellido}</td>
                    <td>{g.nombre}</td>
                    <td>{g.club}</td>
                    <td>{g.niveles?.nombre}</td>
                    <td>{g.categorias?.nombre}</td>

                  </tr>
                )
              })}

            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-box">

        <h2>Turnos creados</h2>

        {turnos.map((turno) => (
          <div
            key={turno.id}
            className="result-category-card"
          >
            <strong>{turno.nombre}</strong>
          </div>
        ))}

      </div>
    </div>
  )
}

export default AdminTurnos