import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'

function AdminTurnos() {
  const location = useLocation()

  const {
    gimnastasInscriptas = [],
    torneoSeleccionado
  } = location.state || {}

  const creandoTurnoRef = useRef(false)
  const guardandoEdicionRef = useRef(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [nombreTurno, setNombreTurno] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [seleccionadas, setSeleccionadas] = useState([])
  const [ordenManual, setOrdenManual] = useState([])
  const [turnos, setTurnos] = useState([])
  const [turnoEditando, setTurnoEditando] = useState(null)
  const [rotacionesTurno, setRotacionesTurno] = useState(null)
  const [asignaciones, setAsignaciones] = useState([])
  const [guardandoRotacion, setGuardandoRotacion] = useState(null)
  const [pendientesTurno, setPendientesTurno] = useState([])
  const [mostrarPendientesTurno, setMostrarPendientesTurno] = useState(false)
  const [errorPendientes, setErrorPendientes] = useState('')

  async function abrirRotaciones(turno) {
    const { data, error } = await supabase.from('turno_gimnastas')
      .select('gimnasta_id, orden, rotacion, gimnastas(id, apellido, nombre, club)')
      .eq('torneo_id', torneoSeleccionado.id).eq('turno_id', turno.id)
      .order('orden', { ascending: true })
    if (error) { alert('No se pudieron cargar las rotaciones: ' + error.message); return }
    setAsignaciones(data || [])
    setRotacionesTurno(turno)
  }

  async function asignarRotacion(item, valor) {
    if (!rotacionesTurno || guardandoRotacion !== null) return
    const rotacion = valor === '' ? null : Number(valor)
    setGuardandoRotacion(item.gimnasta_id)
    const { data, error } = await supabase.from('turno_gimnastas')
      .update({ rotacion })
      .eq('torneo_id', torneoSeleccionado.id)
      .eq('turno_id', rotacionesTurno.id)
      .eq('gimnasta_id', item.gimnasta_id)
      .select('gimnasta_id')
    setGuardandoRotacion(null)
    if (error || !data?.length) { alert('No se guardó la rotación. Revisá los permisos de Supabase. ' + (error?.message || '')); return }
    setAsignaciones(prev => prev.map(x => x.gimnasta_id === item.gimnasta_id ? { ...x, rotacion } : x))
    setTurnos(prev => prev.map(t => t.id === rotacionesTurno.id ? { ...t, sin_rotacion: Math.max(0, (t.sin_rotacion || 0) + (item.rotacion == null && rotacion != null ? -1 : item.rotacion != null && rotacion == null ? 1 : 0)) } : t))
  }


  async function leerTodasLasFilas(tabla, columnas, torneoId) {
    const acumuladas = []
    for (let inicio = 0; ; inicio += 1000) {
      const { data, error } = await supabase.from(tabla)
        .select(columnas).eq('torneo_id', torneoId).range(inicio, inicio + 999)
      if (error) throw error
      acumuladas.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    return acumuladas
  }

  async function obtenerTurnos() {
    if (!torneoSeleccionado?.id) return
    try {
      const { data, error } = await supabase.from('turnos').select('*')
        .eq('torneo_id', torneoSeleccionado.id).order('id', { ascending: false })
      if (error) throw error
      const relaciones = await leerTodasLasFilas('turno_gimnastas', 'turno_id, gimnasta_id, rotacion', torneoSeleccionado.id)
      const inscripciones = await leerTodasLasFilas('inscripciones', 'gimnasta_id', torneoSeleccionado.id)
      const idsAsignados = new Set(relaciones.map(x => String(x.gimnasta_id)))
      const idsInscriptos = [...new Set(inscripciones.map(x => x.gimnasta_id).filter(x => x != null).map(String))]
      const pendientesIds = idsInscriptos.filter(id => !idsAsignados.has(id))
      const detalles = new Map(gimnastasInscriptas.filter(x => x.gimnastas?.id != null).map(x => [String(x.gimnastas.id), x.gimnastas]))
      setPendientesTurno(pendientesIds.map(id => ({ id, gimnasta: detalles.get(id) })))
      setErrorPendientes('')
      setTurnos((data || []).map(turno => {
        const items = relaciones.filter(x => String(x.turno_id) === String(turno.id))
        return { ...turno, total_gimnastas: items.length, sin_rotacion: items.filter(x => x.rotacion == null).length }
      }))
    } catch (error) {
      console.error('Error consultando asignaciones:', error)
      setErrorPendientes(error?.message || 'No se pudieron verificar las asignaciones')
    }
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

  const inscriptasUnicas = [...new Map(gimnastasInscriptas.filter(i => i.gimnastas?.id != null).map(i => [String(i.gimnastas.id), i])).values()]

  const filtradas = [...inscriptasUnicas]
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
    const nuevosIds = ids.map(Number).filter(Number.isFinite)
    setSeleccionadas(prev => [...new Set([...prev.map(Number), ...nuevosIds])])
    setOrdenManual(prev => [...new Set([...prev.map(Number), ...nuevosIds])])
  }

  function seleccionarTodo() {
    agregarIdsALaSeleccion(
      inscriptasUnicas
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
    // Evitar actualizaciones de otro estado dentro del updater de React:
    // StrictMode puede ejecutarlo dos veces y duplicar el orden visual.
    const id = Number(gimnastaId)
    const estabaSeleccionada = seleccionadas.some(x => Number(x) === id)
    setSeleccionadas(prev => estabaSeleccionada
      ? prev.filter(x => Number(x) !== id)
      : [...new Set([...prev.map(Number), id])]
    )
    setOrdenManual(prev => estabaSeleccionada
      ? prev.filter(x => Number(x) !== id)
      : [...new Set([...prev.map(Number), id])]
    )
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
    if (creandoTurnoRef.current) return
    if (!torneoSeleccionado?.id) { alert('No hay torneo seleccionado'); return }
    if (!nombreTurno.trim()) { alert('Poné un nombre al turno'); return }
    const ids = [...new Set(ordenManual.map(String))]
    if (!ids.length) { alert('Seleccioná al menos una gimnasta'); return }
    creandoTurnoRef.current = true
    let turnoCreado = null
    try {
      // Una gimnasta no debe repetirse en el mismo turno, ni enviarse dos veces.
      const { data: asignadas, error: errorConsulta } = await supabase
        .from('turno_gimnastas')
        .select('gimnasta_id, turno_id')
        .eq('torneo_id', torneoSeleccionado.id)
        .in('gimnasta_id', ids)
      if (errorConsulta) throw errorConsulta
      const yaAsignadas = (asignadas || []).filter(x => ids.includes(String(x.gimnasta_id)))
      if (yaAsignadas.length) {
        alert(`No se creó el turno: ${yaAsignadas.length} gimnasta(s) ya están asignadas a un turno de este torneo. Revisá la selección antes de continuar.`)
        return
      }
      const { data, error: errorTurno } = await supabase
        .from('turnos')
        .insert([{ torneo_id: torneoSeleccionado.id, nombre: nombreTurno.trim() }])
        .select().single()
      if (errorTurno) throw errorTurno
      turnoCreado = data
      const registros = ids.map((id, index) => ({
        turno_id: turnoCreado.id,
        torneo_id: torneoSeleccionado.id,
        gimnasta_id: Number(id),
        orden: index + 1
      }))
      const { error: errorRelaciones } = await supabase
        .from('turno_gimnastas').insert(registros)
      if (errorRelaciones) throw errorRelaciones
      alert('Turno creado correctamente')
      setNombreTurno('')
      setSeleccionadas([])
      setOrdenManual([])
      await obtenerTurnos()
    } catch (error) {
      console.error('Error creando turno:', error)
      let mensaje = error?.message || 'Error desconocido'
      if (turnoCreado?.id) {
        // Solo intentamos retirar el turno nuevo y vacío, nunca uno anterior.
        const { count, error: errorConteo } = await supabase
          .from('turno_gimnastas')
          .select('*', { count: 'exact', head: true })
          .eq('turno_id', turnoCreado.id)
        if (!errorConteo && count === 0) {
          const { error: errorBorrado } = await supabase.from('turnos').delete().eq('id', turnoCreado.id)
          if (errorBorrado) mensaje += `\nEl turno vacío ${turnoCreado.id} no pudo eliminarse automáticamente.`
        } else {
          mensaje += `\nRevisá el turno ${turnoCreado.id} antes de volver a intentar.`
        }
      }
      alert('No se pudieron asignar las gimnastas. ' + mensaje)
      await obtenerTurnos()
    } finally {
      creandoTurnoRef.current = false
    }
  }

  function numeroNivelDesdeNombre(nombreNivel) {
    const match = String(nombreNivel || '').match(/\d+/)
    return match ? Number(match[0]) : 999
  }

  function obtenerGimnastaPorId(id) {
    return gimnastasInscriptas.find(
      (i) => Number(i.gimnastas?.id) === Number(id)
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

    const ids = [...new Set((data || []).map((item) => Number(item.gimnasta_id)))]

    setSeleccionadas(ids)
    setOrdenManual(ids)
  }

  async function guardarCambiosTurno() {
    if (!turnoEditando || guardandoEdicionRef.current) return
    if (!torneoSeleccionado?.id) { alert('No hay torneo seleccionado'); return }
    if (!nombreTurno.trim()) { alert('Poné un nombre al turno'); return }

    const ids = [...new Set(ordenManual.map(String))]
    if (!ids.length) { alert('El turno debe tener al menos una gimnasta'); return }
    if (ids.some(id => !/^\d+$/.test(id))) { alert('Hay un ID de gimnasta inválido'); return }

    guardandoEdicionRef.current = true
    setGuardandoEdicion(true)
    try {
      const { data: actuales, error: errorLeer } = await supabase
        .from('turno_gimnastas')
        .select('id, gimnasta_id, orden, rotacion')
        .eq('torneo_id', torneoSeleccionado.id)
        .eq('turno_id', turnoEditando.id)
      if (errorLeer) throw errorLeer

      const actualesPorId = new Map((actuales || []).map(fila => [String(fila.gimnasta_id), fila]))
      const nuevos = ids.filter(id => !actualesPorId.has(id))
      const retirados = (actuales || []).filter(fila => !ids.includes(String(fila.gimnasta_id)))

      // Verificar que las nuevas gimnastas no pertenezcan a otro turno del torneo.
      if (nuevos.length) {
        const { data: ocupadas, error: errorOcupadas } = await supabase
          .from('turno_gimnastas')
          .select('gimnasta_id, turno_id')
          .eq('torneo_id', torneoSeleccionado.id)
          .in('gimnasta_id', nuevos.map(Number))
        if (errorOcupadas) throw errorOcupadas
        const enOtroTurno = (ocupadas || []).filter(fila => fila.turno_id !== turnoEditando.id)
        if (enOtroTurno.length) {
          throw new Error(`${enOtroTurno.length} gimnasta(s) ya están en otro turno de este torneo. No se guardaron cambios.`)
        }
      }

      // Primero agregar nuevas; nunca borrar las asignaciones existentes para recrearlas.
      if (nuevos.length) {
        const registros = nuevos.map(id => ({
          turno_id: turnoEditando.id,
          torneo_id: torneoSeleccionado.id,
          gimnasta_id: Number(id),
          orden: ids.indexOf(id) + 1
        }))
        const { error } = await supabase.from('turno_gimnastas').insert(registros)
        if (error) throw error
      }

      // Cambiar solamente el orden de las filas existentes; se conserva su rotación.
      for (let index = 0; index < ids.length; index++) {
        const actual = actualesPorId.get(ids[index])
        if (!actual || Number(actual.orden) === index + 1) continue
        const { error } = await supabase.from('turno_gimnastas')
          .update({ orden: index + 1 })
          .eq('id', actual.id)
          .eq('torneo_id', torneoSeleccionado.id)
          .eq('turno_id', turnoEditando.id)
        if (error) throw error
      }

      // Quitar únicamente las gimnastas que el administrador retiró de la selección.
      // No se eliminan puntajes de la tabla puntajes ni se toca otro turno.
      for (const fila of retirados) {
        const { error } = await supabase.from('turno_gimnastas')
          .delete()
          .eq('id', fila.id)
          .eq('torneo_id', torneoSeleccionado.id)
          .eq('turno_id', turnoEditando.id)
        if (error) throw error
      }

      const { error: errorNombre } = await supabase.from('turnos')
        .update({ nombre: nombreTurno.trim() })
        .eq('id', turnoEditando.id)
        .eq('torneo_id', torneoSeleccionado.id)
      if (errorNombre) throw errorNombre

      alert('Turno actualizado correctamente')
      setTurnoEditando(null)
      setNombreTurno('')
      setSeleccionadas([])
      setOrdenManual([])
      await obtenerTurnos()
    } catch (error) {
      console.error('Error detallado al guardar turno:', error)
      alert(`No se completó la edición. Revisá el estado del turno antes de reintentar.\nCódigo: ${error?.code || 'sin código'}\nMensaje: ${error?.message || 'Error desconocido'}\nDetalle: ${error?.details || 'sin detalle'}`)
      await obtenerTurnos()
    } finally {
      guardandoEdicionRef.current = false
      setGuardandoEdicion(false)
    }
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
            [...new Set(ordenManual.map(Number))].map((id, index) => {
              const gimnasta = gimnastasInscriptas.find(
                (i) => Number(i.gimnastas?.id) === Number(id)
              )?.gimnastas

              if (!gimnasta) return null

              return (
                <div
                  key={String(id)}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                    padding: '8px 0',
                    borderBottom: '1px solid #ddd'
                  }}
                >
                  <strong>{index + 1}.</strong>

                  <span style={{ flex: '1 1 260px', minWidth: 0 }}>
                    {gimnasta.apellido} {gimnasta.nombre}
                    {' · '}
                    {gimnasta.club || 'Sin club'}
                    {' · '}
                    {gimnasta.niveles?.nombre || 'Sin nivel'}
                  </span>

                  <button type="button" style={{ width: 42, minWidth: 42, flex: "0 0 42px", padding: "8px" }} onClick={() => moverArriba(index)}>
                    ↑
                  </button>

                  <button type="button" style={{ width: 42, minWidth: 42, flex: "0 0 42px", padding: "8px" }} onClick={() => moverAbajo(index)}>
                    ↓
                  </button>

                  <button
                    type="button"
                    className="danger"
                    style={{ width: "auto", minWidth: 70, flex: "0 0 auto", padding: "8px 12px" }}
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
            <button onClick={guardarCambiosTurno} disabled={guardandoEdicion}>
              {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
            </button>

            <button className="danger" onClick={cancelarEdicionTurno} disabled={guardandoEdicion}>
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

      {rotacionesTurno && (
        <div className="admin-box" style={{ border: '2px solid var(--primary-color, #777)' }}>
          <h2>Rotaciones · {rotacionesTurno.nombre}</h2>
          <p>Asignadas: {asignaciones.filter(x => x.rotacion >= 1 && x.rotacion <= 4).length} / {asignaciones.length} · Sin asignar: <strong>{asignaciones.filter(x => !x.rotacion).length}</strong></p>
          {asignaciones.some(x => !x.rotacion) && <p role="alert" style={{ color: '#b45309', fontWeight: 700 }}>⚠ Hay gimnastas sin rotación. Asignalas antes de competir.</p>}
          <button type="button" onClick={() => { setRotacionesTurno(null); setAsignaciones([]) }}>Cerrar</button>
          <div className="table-wrapper"><table className="admin-table"><thead><tr><th>Gimnasta</th><th>Club</th><th>Rotación</th></tr></thead><tbody>
          {asignaciones.map(item => <tr key={item.gimnasta_id}>
            <td>{item.gimnastas?.apellido}, {item.gimnastas?.nombre}</td>
            <td>{item.gimnastas?.club}</td>
            <td><select value={item.rotacion ?? ''} disabled={guardandoRotacion !== null} onChange={e => asignarRotacion(item, e.target.value)}>
              <option value="">Sin asignar</option>
              {[1,2,3,4].map(n => <option key={n} value={n}>Rotación {n}</option>)}
            </select></td>
          </tr>)}
          </tbody></table></div>
        </div>
      )}
      <div className="admin-box">
        <h2>Control de asignaciones</h2>
        {errorPendientes ? <p role="alert" style={{ color: '#b91c1c' }}>No se pudo comprobar quiénes están sin turno: {errorPendientes}</p> : (
          <>
            <p><strong>{pendientesTurno.length} gimnasta(s) inscriptas sin turno asignado.</strong></p>
            {pendientesTurno.length > 0 && <button type="button" onClick={() => setMostrarPendientesTurno(x => !x)}>
              {mostrarPendientesTurno ? 'Ocultar listado' : 'Ver gimnastas sin turno'}
            </button>}
            {mostrarPendientesTurno && pendientesTurno.length > 0 && (
              <div className="table-wrapper"><table className="admin-table"><thead><tr><th>Apellido y nombre</th><th>Club</th><th>ID</th></tr></thead><tbody>
                {pendientesTurno.map(({ id, gimnasta }) => <tr key={id}>
                  <td>{gimnasta ? `${gimnasta.apellido || ''}, ${gimnasta.nombre || ''}` : 'No disponible en el listado actual'}</td>
                  <td>{gimnasta?.club || '—'}</td><td>{id}</td>
                </tr>)}
              </tbody></table></div>
            )}
          </>
        )}
        <button type="button" onClick={obtenerTurnos}>Actualizar control</button>
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
              <p style={{ color: turno.sin_rotacion ? '#b45309' : 'inherit' }}>
                {turno.sin_rotacion ? `⚠ ${turno.sin_rotacion} sin rotación asignada` : turno.total_gimnastas ? '✓ Todas con rotación asignada' : 'Turno sin gimnastas'}
              </p>

              <div className="table-buttons">
                <button type="button" onClick={() => abrirRotaciones(turno)}>
                  Organizar rotaciones
                </button>
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