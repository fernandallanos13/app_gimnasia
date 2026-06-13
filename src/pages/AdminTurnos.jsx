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
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [seleccionadas, setSeleccionadas] = useState([])
  const [ordenManual, setOrdenManual] = useState([])
  const [turnos, setTurnos] = useState([])
  const [turnoEditando, setTurnoEditando] = useState(null)

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

    const turnosConTotales = await Promise.all(
      (data || []).map(async (turno) => {
        const { count } = await supabase
          .from('turno_gimnastas')
          .select('*', { count: 'exact', head: true })
          .eq('turno_id', turno.id)

        return {
          ...turno,
          total_gimnastas: count || 0
        }
      })
    )

    setTurnos(turnosConTotales)
  }

  useEffect(() => {
    if (torneoSeleccionado?.id) {
      obtenerTurnos()
    }
  }, [])

  const nivelesDisponibles = [
    ...new Map(
      gimnastasInscriptas
        .map((i) => {
          const g = i.gimnastas
          if (!g?.nivel_id) return null

          return {
            id: g.nivel_id,
            nombre: g.niveles?.nombre || `Nivel ${g.nivel_id}`
          }
        })
        .filter(Boolean)
        .map((nivel) => [nivel.id, nivel])
    ).values()
  ]

  const categoriasDisponibles = [
    ...new Map(
      gimnastasInscriptas
        .map((i) => {
          const g = i.gimnastas
          if (!g?.categoria_id) return null

          return {
            id: g.categoria_id,
            nombre: g.categorias?.nombre || `Categoría ${g.categoria_id}`
          }
        })
        .filter(Boolean)
        .map((categoria) => [categoria.id, categoria])
    ).values()
  ]

  const filtradas = [...gimnastasInscriptas]
    .filter((inscripcion) => {
      const g = inscripcion.gimnastas

      const texto =
        `${g?.apellido} ${g?.nombre} ${g?.club}`.toLowerCase()

      const coincideBusqueda =
        texto.includes(busqueda.toLowerCase())

      const coincideNivel =
        !filtroNivel ||
        String(g?.nivel_id) === String(filtroNivel)

      const coincideCategoria =
        !filtroCategoria ||
        String(g?.categoria_id) === String(filtroCategoria)

      return coincideBusqueda && coincideNivel && coincideCategoria
    })
    .sort((a, b) => {
      const nivelA = a.gimnastas?.niveles?.nombre || ''
      const nivelB = b.gimnastas?.niveles?.nombre || ''

      const numeroNivelA = Number(nivelA.replace(/\D/g, ''))
      const numeroNivelB = Number(nivelB.replace(/\D/g, ''))

      if (numeroNivelA !== numeroNivelB) {
        return numeroNivelA - numeroNivelB
      }

      const categoriaA =
        a.gimnastas?.categorias?.nombre?.toLowerCase() || ''

      const categoriaB =
        b.gimnastas?.categorias?.nombre?.toLowerCase() || ''

      if (categoriaA !== categoriaB) {
        return categoriaA.localeCompare(categoriaB)
      }

      const apellidoA =
        a.gimnastas?.apellido?.toLowerCase() || ''

      const apellidoB =
        b.gimnastas?.apellido?.toLowerCase() || ''

      return apellidoA.localeCompare(apellidoB)
    })

  function toggleSeleccion(gimnastaId) {
    setSeleccionadas((prev) => {
      if (prev.includes(gimnastaId)) {
        setOrdenManual((ordenPrev) =>
          ordenPrev.filter((id) => id !== gimnastaId)
        )

        return prev.filter((id) => id !== gimnastaId)
      }

      setOrdenManual((ordenPrev) => [
        ...ordenPrev,
        gimnastaId
      ])

      return [...prev, gimnastaId]
    })
  }

  function quitarGimnastaDelTurno(gimnastaId) {
    setSeleccionadas((prev) =>
      prev.filter((id) => id !== gimnastaId)
    )

    setOrdenManual((prev) =>
      prev.filter((id) => id !== gimnastaId)
    )
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

    const registros = ordenManual.map((gimnastaId, index) => ({
      turno_id: turnoCreado.id,
      torneo_id: torneoSeleccionado.id,
      gimnasta_id: gimnastaId,
      orden: index + 1
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
    setOrdenManual([])

    obtenerTurnos()
  }

  function moverArriba(index) {
    if (index === 0) return

    const nuevoOrden = [...ordenManual]

    ;[
      nuevoOrden[index - 1],
      nuevoOrden[index]
    ] = [
      nuevoOrden[index],
      nuevoOrden[index - 1]
    ]

    setOrdenManual(nuevoOrden)
  }

  function moverAbajo(index) {
    if (index === ordenManual.length - 1) return

    const nuevoOrden = [...ordenManual]

    ;[
      nuevoOrden[index + 1],
      nuevoOrden[index]
    ] = [
      nuevoOrden[index],
      nuevoOrden[index + 1]
    ]

    setOrdenManual(nuevoOrden)
  }

  async function editarTurno(turno) {
    setTurnoEditando(turno)
    setNombreTurno(turno.nombre)

    const { data, error } = await supabase
      .from('turno_gimnastas')
      .select('gimnasta_id, orden')
      .eq('turno_id', turno.id)
      .order('orden', { ascending: true })

    if (error) {
      console.log(error)
      alert('Error al traer gimnastas del turno')
      return
    }

    const ids = (data || []).map((item) => item.gimnasta_id)

    setSeleccionadas(ids)
    setOrdenManual(ids)
  }

  async function guardarCambiosTurno() {
    if (!turnoEditando) return

    if (!nombreTurno.trim()) {
      alert('Poné un nombre al turno')
      return
    }

    if (ordenManual.length === 0) {
      alert('El turno debe tener al menos una gimnasta')
      return
    }

    const { error: errorNombre } = await supabase
      .from('turnos')
      .update({
        nombre: nombreTurno.trim()
      })
      .eq('id', turnoEditando.id)

    if (errorNombre) {
      console.log(errorNombre)
      alert('Error al actualizar el turno')
      return
    }

    const { error: errorBorrar } = await supabase
      .from('turno_gimnastas')
      .delete()
      .eq('turno_id', turnoEditando.id)

    if (errorBorrar) {
      console.log(errorBorrar)
      alert('Error al borrar el orden anterior')
      return
    }

    const registros = ordenManual.map((gimnastaId, index) => ({
      turno_id: turnoEditando.id,
      torneo_id: torneoSeleccionado.id,
      gimnasta_id: gimnastaId,
      orden: index + 1
    }))

    const { error: errorInsertar } = await supabase
      .from('turno_gimnastas')
      .insert(registros)

    if (errorInsertar) {
      console.log(errorInsertar)
      alert('Error al guardar gimnastas del turno')
      return
    }

    alert('Turno actualizado')

    setTurnoEditando(null)
    setNombreTurno('')
    setSeleccionadas([])
    setOrdenManual([])
    obtenerTurnos()
  }

  async function eliminarTurno(turno) {
    const confirmar = window.confirm(
      `¿Eliminar el turno "${turno.nombre}"? Se quitarán sus gimnastas asignadas y las juezas asignadas a ese turno.`
    )

    if (!confirmar) return

    const { error: errorJueces } = await supabase
      .from('juez_grupos')
      .delete()
      .eq('turno_id', turno.id)

    if (errorJueces) {
      console.log(errorJueces)
      alert('No se pudieron eliminar las asignaciones de jueces de este turno')
      return
    }

    const { error: errorGimnastas } = await supabase
      .from('turno_gimnastas')
      .delete()
      .eq('turno_id', turno.id)

    if (errorGimnastas) {
      console.log(errorGimnastas)
      alert('No se pudieron eliminar las gimnastas del turno')
      return
    }

    const { error: errorTurno } = await supabase
      .from('turnos')
      .delete()
      .eq('id', turno.id)

    if (errorTurno) {
      console.log(errorTurno)
      alert('No se pudo eliminar el turno')
      return
    }

    if (turnoEditando?.id === turno.id) {
      cancelarEdicionTurno()
    }

    alert('Turno eliminado')
    obtenerTurnos()
  }

  function cancelarEdicionTurno() {
    setTurnoEditando(null)
    setNombreTurno('')
    setSeleccionadas([])
    setOrdenManual([])
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

        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
        >
          <option value="">Todos los niveles</option>

          {nivelesDisponibles.map((nivel) => (
            <option key={nivel.id} value={nivel.id}>
              {nivel.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>

          {categoriasDisponibles.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>

        <p>
          Seleccionadas: <strong>{seleccionadas.length}</strong>
        </p>

        <div className="admin-box">
          <h3>Orden manual</h3>

          {ordenManual.length === 0 ? (
            <p>No hay gimnastas seleccionadas.</p>
          ) : (
            ordenManual.map((id, index) => {
              const gimnasta = gimnastasInscriptas.find(
                (i) => i.gimnastas?.id === id
              )?.gimnastas

              if (!gimnasta) return null

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    marginBottom: '6px',
                    flexWrap: 'wrap'
                  }}
                >
                  <strong>{index + 1}.</strong>

                  <span>
                    {gimnasta.apellido} {gimnasta.nombre}
                  </span>

                  <button onClick={() => moverArriba(index)}>
                    ↑
                  </button>

                  <button onClick={() => moverAbajo(index)}>
                    ↓
                  </button>

                  <button
                    className="danger"
                    onClick={() => quitarGimnastaDelTurno(id)}
                  >
                    Quitar
                  </button>
                </div>
              )
            })
          )}
        </div>

        {turnoEditando ? (
          <div className="table-buttons">
            <button onClick={guardarCambiosTurno}>
              Guardar cambios
            </button>

            <button className="danger" onClick={cancelarEdicionTurno}>
              Cancelar edición
            </button>
          </div>
        ) : (
          <button onClick={crearTurno}>
            Crear turno
          </button>
        )}
      </div>

      <div className="admin-box">
        <h2>
          Gimnastas filtradas: {filtradas.length}
        </h2>

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

        {turnos.length === 0 ? (
          <p>No hay turnos creados.</p>
        ) : (
          turnos.map((turno) => (
            <div
              key={turno.id}
              className="result-category-card"
            >
              <strong>
                {turno.nombre} - TOTAL: {turno.total_gimnastas || 0}
              </strong>

              <div className="table-buttons">
                <button onClick={() => editarTurno(turno)}>
                  Editar turno
                </button>

                <button
                  className="danger"
                  onClick={() => eliminarTurno(turno)}
                >
                  Eliminar turno
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AdminTurnos