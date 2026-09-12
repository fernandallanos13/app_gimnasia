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

  function agregarIdsALaSeleccion(ids) {
    const nuevosIds = [...new Set(ids)]

    setSeleccionadas((prev) => {
      const combinado = [...prev]

      nuevosIds.forEach((id) => {
        if (!combinado.includes(id)) combinado.push(id)
      })

      return combinado
    })

    setOrdenManual((prev) => {
      const combinado = [...prev]

      nuevosIds.forEach((id) => {
        if (!combinado.includes(id)) combinado.push(id)
      })

      return combinado
    })
  }

  function seleccionarTodo() {
    agregarIdsALaSeleccion(
      gimnastasInscriptas
        .map((i) => i.gimnastas?.id)
        .filter(Boolean)
    )
  }

  function seleccionarFiltradas() {
    agregarIdsALaSeleccion(
      filtradas
        .map((i) => i.gimnastas?.id)
        .filter(Boolean)
    )
  }

  function deseleccionarTodo() {
    setSeleccionadas([])
    setOrdenManual([])
  }

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

  function numeroNivelDesdeNombre(nombreNivel) {
    const match = String(nombreNivel || '').match(/\d+/)
    return match ? Number(match[0]) : 999
  }

  function obtenerGimnastaPorId(id) {
    return gimnastasInscriptas.find(
      (i) => i.gimnastas?.id === id
    )?.gimnastas
  }

  function ordenarTurnoPor(tipo) {
    if (ordenManual.length < 2) return

    const normalizar = (texto) =>
      String(texto || '')
        .trim()
        .toLocaleLowerCase('es')

    const compararTexto = (a, b) =>
      normalizar(a).localeCompare(normalizar(b), 'es')

    const nuevoOrden = [...ordenManual].sort((idA, idB) => {
      const a = obtenerGimnastaPorId(idA)
      const b = obtenerGimnastaPorId(idB)

      if (!a || !b) return 0

      const clubA = a.club || ''
      const clubB = b.club || ''
      const nivelA = numeroNivelDesdeNombre(a.niveles?.nombre)
      const nivelB = numeroNivelDesdeNombre(b.niveles?.nombre)
      const apellidoA = a.apellido || ''
      const apellidoB = b.apellido || ''
      const nombreA = a.nombre || ''
      const nombreB = b.nombre || ''

      if (tipo === 'club') {
        const porClub = compararTexto(clubA, clubB)
        if (porClub !== 0) return porClub
      }

      if (tipo === 'nivel') {
        if (nivelA !== nivelB) return nivelA - nivelB
      }

      if (tipo === 'club-nivel') {
        const porClub = compararTexto(clubA, clubB)
        if (porClub !== 0) return porClub

        if (nivelA !== nivelB) return nivelA - nivelB
      }

      const porApellido = compararTexto(apellidoA, apellidoB)
      if (porApellido !== 0) return porApellido

      return compararTexto(nombreA, nombreB)
    })

    setOrdenManual(nuevoOrden)
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

  async function cambiarPublicacionTurno(turno, publicado) {
    const accion = publicado ? 'PUBLICAR' : 'OCULTAR'

    const confirmar = window.confirm(
      `${accion} los resultados de "${turno.nombre}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('publicacion_turnos')
      .upsert(
        [
          {
            torneo_id: torneoSeleccionado.id,
            turno_id: turno.id,
            publicado,
            publicado_en: publicado ? new Date().toISOString() : null
          }
        ],
        {
          onConflict: 'torneo_id,turno_id'
        }
      )

    if (error) {
      console.log(error)
      alert(
        'No se pudo cambiar la publicación del turno. Verificá que hayas ejecutado primero el SQL de publicación por turnos.'
      )
      return
    }

    alert(
      publicado
        ? `Resultados de "${turno.nombre}" publicados.`
        : `Resultados de "${turno.nombre}" ocultados.`
    )
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

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '10px',
            marginBottom: '10px'
          }}
        >
          <button
            type="button"
            onClick={seleccionarFiltradas}
            disabled={filtradas.length === 0}
          >
            Seleccionar todo lo filtrado ({filtradas.length})
          </button>

          <button
            type="button"
            onClick={seleccionarTodo}
            disabled={gimnastasInscriptas.length === 0}
          >
            Seleccionar TODAS ({gimnastasInscriptas.length})
          </button>

          <button
            type="button"
            className="danger"
            onClick={deseleccionarTodo}
            disabled={seleccionadas.length === 0}
          >
            Deseleccionar todo
          </button>
        </div>

        <p>
          Seleccionadas: <strong>{seleccionadas.length}</strong>
        </p>

        <div className="admin-box">
          <h3>Orden del turno</h3>

          {ordenManual.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '12px'
              }}
            >
              <button
                type="button"
                onClick={() => ordenarTurnoPor('club')}
              >
                Ordenar por club
              </button>

              <button
                type="button"
                onClick={() => ordenarTurnoPor('nivel')}
              >
                Ordenar por nivel
              </button>

              <button
                type="button"
                onClick={() => ordenarTurnoPor('club-nivel')}
              >
                Ordenar por club + nivel
              </button>
            </div>
          )}

          {turnoEditando && ordenManual.length > 1 && (
            <p style={{ marginTop: 0, opacity: 0.75 }}>
              Podés reordenar el turno ya creado y después tocar “Guardar cambios”.
            </p>
          )}

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
                    {' · '}
                    {gimnasta.club || 'Sin club'}
                    {' · '}
                    {gimnasta.niveles?.nombre || 'Sin nivel'}
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
                <button
                  onClick={() => cambiarPublicacionTurno(turno, true)}
                  style={{ background: '#198754' }}
                >
                  Publicar resultados
                </button>

                <button
                  onClick={() => cambiarPublicacionTurno(turno, false)}
                >
                  Ocultar resultados
                </button>

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