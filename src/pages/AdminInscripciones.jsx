import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

const CATEGORIAS = [
  { id: 5, nombre: 'Miniatura 3-4-5 Años' },
  { id: 6, nombre: 'Pre-Mini 6-7 Años' },
  { id: 7, nombre: 'Mini 8-9 Años' },
  { id: 8, nombre: 'Pre-Infantil 10-11 Años' },
  { id: 9, nombre: 'Infantil 12-13 Años' },
  { id: 10, nombre: 'Juvenil 14-15 Años' },
  { id: 11, nombre: 'Mayores 16+ Años' }
]

function separarNombreApellido(nombreCompleto) {
  const partes = String(nombreCompleto || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)

  if (partes.length === 0) {
    return { nombre: '', apellido: '' }
  }

  if (partes.length === 1) {
    return { nombre: partes[0], apellido: '' }
  }

  return {
    apellido: partes[0],
    nombre: partes.slice(1).join(' ')
  }
}

function AdminInscripciones() {
  const {
    esSuperAdmin,
    clubId: clubIdCuenta,
    club: clubCuenta
  } = useAuth()

  const [inscripciones, setInscripciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroClub, setFiltroClub] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [borrador, setBorrador] = useState({})
  const [guardando, setGuardando] = useState(false)

  async function obtenerInscripciones() {
    setCargando(true)

    try {
      if (esSuperAdmin) {
        const { data, error } = await supabase
          .from('pre_inscripciones')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        setInscripciones(data || [])
        return
      }

      if (!clubIdCuenta) {
        setInscripciones([])
        return
      }

      const { data: torneosClub, error: errorTorneos } =
        await supabase
          .from('torneos')
          .select('id')
          .eq('club_id', clubIdCuenta)

      if (errorTorneos) throw errorTorneos

      const idsTorneos = (torneosClub || [])
        .map((torneo) => torneo.id)

      if (idsTorneos.length === 0) {
        setInscripciones([])
        return
      }

      const { data, error } = await supabase
        .from('pre_inscripciones')
        .select('*')
        .in('torneo_id', idsTorneos)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInscripciones(data || [])
    } catch (error) {
      console.error('Error al traer preinscripciones:', error)
      setInscripciones([])

      const detalle =
        error?.message ||
        error?.details ||
        error?.hint ||
        'No se pudo consultar la base de datos.'

      alert(
        `Error al traer preinscripciones.\n\n${detalle}`
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    obtenerInscripciones()
  }, [esSuperAdmin, clubIdCuenta])

  const clubes = useMemo(() => {
    return [
      ...new Set(
        inscripciones.map((i) => i.club).filter(Boolean)
      )
    ].sort()
  }, [inscripciones])

  const niveles = useMemo(() => {
    return [
      ...new Set(
        inscripciones.map((i) => i.nivel).filter(Boolean)
      )
    ].sort()
  }, [inscripciones])

  const categorias = useMemo(() => {
    return [
      ...new Set(
        inscripciones.map((i) => i.categoria).filter(Boolean)
      )
    ].sort()
  }, [inscripciones])

  const filtradas = inscripciones.filter((i) => {
    const coincideClub = filtroClub
      ? i.club === filtroClub
      : true

    const coincideNivel = filtroNivel
      ? i.nivel === filtroNivel
      : true

    const coincideCategoria = filtroCategoria
      ? i.categoria === filtroCategoria
      : true

    return (
      coincideClub &&
      coincideNivel &&
      coincideCategoria
    )
  })

  function convertirParaExcel(lista) {
    return lista.map((item) => {
      const separado = separarNombreApellido(
        item.nombre_completo
      )

      return {
        nombre: separado.nombre,
        apellido: separado.apellido,
        club: item.club || '',
        profe: item.profe_responsable || '',
        nivel: item.nivel || '',
        categoria: item.categoria || ''
      }
    })
  }

  function descargarExcel(lista, nombreArchivo) {
    if (lista.length === 0) {
      alert(
        'No hay inscripciones para descargar con esos filtros.'
      )
      return
    }

    const datosExcel = convertirParaExcel(lista)

    const hoja = XLSX.utils.json_to_sheet(datosExcel)
    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      libro,
      hoja,
      'Inscriptas'
    )

    XLSX.writeFile(libro, nombreArchivo)
  }

  function descargarFiltrado() {
    const partes = [
      filtroClub || 'todos-los-clubes',
      filtroNivel || 'todos-los-niveles',
      filtroCategoria || 'todas-las-categorias'
    ]

    const nombreArchivo = `preinscripciones-${partes
      .join('-')
      .replace(/\s+/g, '-')
      .toLowerCase()}.xlsx`

    descargarExcel(filtradas, nombreArchivo)
  }

  function comenzarEdicion(item) {
    if (item.estado === 'importada') {
      alert(
        'Esta inscripción ya está marcada como importada. No se puede editar desde aquí.'
      )
      return
    }

    setEditandoId(item.id)

    setBorrador({
      nombre_completo: item.nombre_completo || '',
      club: item.club || '',
      profe_responsable: item.profe_responsable || '',
      nivel: item.nivel || '',
      categoria: item.categoria || ''
    })
  }

  function cambiarCampo(campo, valor) {
    setBorrador((anterior) => ({
      ...anterior,
      [campo]: valor
    }))
  }

  async function guardarEdicion(item) {
    const datos = Object.fromEntries(
      Object.entries(borrador).map(([clave, valor]) => [
        clave,
        String(valor)
          .trim()
          .replace(/\s+/g, ' ')
      ])
    )

    if (
      !datos.nombre_completo ||
      !datos.club ||
      !datos.nivel ||
      !datos.categoria
    ) {
      alert(
        'Completá nombre completo, club, nivel y categoría.'
      )
      return
    }

    const cambios = { ...datos }

    if (datos.nivel !== item.nivel) {
      const { data, error } = await supabase
        .from('niveles')
        .select('id, nombre')
        .eq('nombre', datos.nivel)
        .maybeSingle()

      if (error || !data) {
        alert(
          'No se pudo encontrar el nivel en Supabase. No se guardaron cambios.'
        )
        return
      }

      cambios.nivel_id = data.id
    }

    if (datos.categoria !== item.categoria) {
      const data = CATEGORIAS.find(
        (c) => c.nombre === datos.categoria
      )

      if (!data) {
        alert(
          'No se pudo encontrar la categoría en Supabase. No se guardaron cambios.'
        )
        return
      }

      cambios.categoria_id = data.id
    }

    setGuardando(true)

    try {
      const { data, error } = await supabase
        .from('pre_inscripciones')
        .update(cambios)
        .eq('id', item.id)
        .neq('estado', 'importada')
        .select('*')

      if (error) throw error

      if (!data?.length) {
        throw new Error(
          'No se pudo confirmar la edición. Revisá los permisos de Supabase o si la inscripción ya fue importada.'
        )
      }

      setInscripciones((anteriores) =>
        anteriores.map((i) =>
          i.id === item.id ? data[0] : i
        )
      )

      setEditandoId(null)
      setBorrador({})
    } catch (error) {
      console.error(
        'Error editando preinscripción:',
        error
      )

      alert(
        `No se pudo guardar la edición.\n\n${
          error.message || 'Error desconocido'
        }`
      )
    } finally {
      setGuardando(false)
    }
  }

  async function marcarComoImportadas() {
    if (editandoId !== null) {
      alert(
        'Guardá o cancelá la edición antes de continuar.'
      )
      return
    }

    if (filtradas.length === 0) {
      alert(
        'No hay inscripciones filtradas para marcar.'
      )
      return
    }

    const confirmar = window.confirm(
      `¿Marcar ${filtradas.length} inscripción/es como importadas?`
    )

    if (!confirmar) return

    const ids = filtradas.map((i) => i.id)

    const { error } = await supabase
      .from('pre_inscripciones')
      .update({ estado: 'importada' })
      .in('id', ids)

    if (error) {
      console.error(error)
      alert(
        `Error al marcar como importadas.\n\n${
          error.message || ''
        }`
      )
      return
    }

    alert('Inscripciones marcadas como importadas')
    obtenerInscripciones()
  }

  async function eliminarImportadas() {
    const importadas = inscripciones.filter(
      (i) => i.estado === 'importada'
    )

    if (importadas.length === 0) {
      alert(
        'No hay preinscripciones marcadas como importadas.'
      )
      return
    }

    const confirmar = window.confirm(
      `¿Eliminar ${importadas.length} preinscripción/es ya importadas? Esta acción no se puede deshacer.`
    )

    if (!confirmar) return

    const ids = importadas.map((i) => i.id)

    const { error } = await supabase
      .from('pre_inscripciones')
      .delete()
      .in('id', ids)

    if (error) {
      console.error(error)
      alert(
        `Error al eliminar las importadas.\n\n${
          error.message || ''
        }`
      )
      return
    }

    alert('Preinscripciones importadas eliminadas')
    obtenerInscripciones()
  }

  async function eliminarInscripcion(id) {
    const confirmar = window.confirm(
      '¿Eliminar esta preinscripción?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('pre_inscripciones')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert(
        `Error al eliminar.\n\n${
          error.message || ''
        }`
      )
      return
    }

    obtenerInscripciones()
  }

  return (
    <div className="admin-pre-page">
      <header className="admin-pre-header">
        {clubCuenta?.logo_url && (
          <img
            className="admin-pre-logo"
            src={clubCuenta.logo_url}
            alt={clubCuenta.nombre || 'Club'}
          />
        )}

        <h1>Preinscripciones</h1>

        {clubCuenta?.nombre && (
          <h2>{clubCuenta.nombre}</h2>
        )}

        <p>
          Revisá, filtrá y descargá el Excel compatible
          con el sistema.
        </p>
      </header>

      <main className="admin-pre-container">
        <section className="admin-pre-card">
          <h2>Filtros</h2>

          <div className="filters-grid">
            <label>
              Club
              <select
                value={filtroClub}
                onChange={(e) =>
                  setFiltroClub(e.target.value)
                }
              >
                <option value="">Todos</option>
                {clubes.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nivel
              <select
                value={filtroNivel}
                onChange={(e) =>
                  setFiltroNivel(e.target.value)
                }
              >
                <option value="">Todos</option>
                {niveles.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Categoría
              <select
                value={filtroCategoria}
                onChange={(e) =>
                  setFiltroCategoria(e.target.value)
                }
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option
                    key={categoria}
                    value={categoria}
                  >
                    {categoria}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="count-box">
            {filtradas.length} inscripción/es encontradas
          </p>

          <div className="button-row">
            <button onClick={descargarFiltrado}>
              Descargar Excel
            </button>

            <button
              className="secondary"
              onClick={marcarComoImportadas}
            >
              Marcar como importadas
            </button>

            <button
              className="danger"
              onClick={eliminarImportadas}
            >
              Eliminar importadas
            </button>
          </div>
        </section>

        <section className="admin-pre-card">
          <h2>Listado recibido</h2>

          {cargando ? (
            <p>Cargando...</p>
          ) : filtradas.length === 0 ? (
            <p>
              No hay preinscripciones con esos filtros.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Club</th>
                    <th>Profe</th>
                    <th>Nivel</th>
                    <th>Categoría</th>
                    <th>Nombre completo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtradas.map((item) => {
                    const editando =
                      editandoId === item.id

                    const campo = (nombre) => (
                      <input
                        aria-label={nombre.replaceAll(
                          '_',
                          ' '
                        )}
                        value={borrador[nombre] || ''}
                        onChange={(e) =>
                          cambiarCampo(
                            nombre,
                            e.target.value
                          )
                        }
                        disabled={guardando}
                        className="pre-edit-input"
                      />
                    )

                    return (
                      <tr key={item.id}>
                        <td>
                          {editando
                            ? campo('club')
                            : item.club}
                        </td>

                        <td>
                          {editando
                            ? campo('profe_responsable')
                            : (
                              item.profe_responsable || '-'
                            )}
                        </td>

                        <td>
                          {editando ? (
                            <select
                              value={borrador.nivel || ''}
                              onChange={(e) =>
                                cambiarCampo(
                                  'nivel',
                                  e.target.value
                                )
                              }
                              disabled={guardando}
                            >
                              {[
                                ...new Set(
                                  [
                                    item.nivel,
                                    ...niveles
                                  ].filter(Boolean)
                                )
                              ].map((n) => (
                                <option
                                  key={n}
                                  value={n}
                                >
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.nivel
                          )}
                        </td>

                        <td>
                          {editando ? (
                            <select
                              value={
                                borrador.categoria || ''
                              }
                              onChange={(e) =>
                                cambiarCampo(
                                  'categoria',
                                  e.target.value
                                )
                              }
                              disabled={guardando}
                            >
                              {[
                                ...new Set(
                                  [
                                    item.categoria,
                                    ...CATEGORIAS.map(
                                      (c) => c.nombre
                                    )
                                  ].filter(Boolean)
                                )
                              ].map((c) => (
                                <option
                                  key={c}
                                  value={c}
                                >
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.categoria
                          )}
                        </td>

                        <td>
                          {editando
                            ? campo('nombre_completo')
                            : item.nombre_completo}
                        </td>

                        <td>
                          {item.estado || 'pendiente'}
                        </td>

                        <td>
                          {editando ? (
                            <div className="pre-actions">
                              <button
                                className="small"
                                disabled={guardando}
                                onClick={() =>
                                  guardarEdicion(item)
                                }
                              >
                                {guardando
                                  ? 'Guardando...'
                                  : 'Guardar'}
                              </button>

                              <button
                                className="secondary small"
                                disabled={guardando}
                                onClick={() => {
                                  setEditandoId(null)
                                  setBorrador({})
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="pre-actions">
                              {item.estado !==
                                'importada' && (
                                <button
                                  className="small"
                                  disabled={
                                    editandoId !== null
                                  }
                                  onClick={() =>
                                    comenzarEdicion(item)
                                  }
                                >
                                  Editar
                                </button>
                              )}

                              
<button
  className="danger small"
  disabled={editandoId !== null}
  onClick={() => eliminarInscripcion(item.id)}
>
  Eliminar
</button>
</div>
)}
</td>
</tr>
)
})}
</tbody>
</table>
</div>
)}
</section>
</main>
</div>
)
}

export default AdminInscripciones
