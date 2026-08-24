import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../services/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useAuth } from '../context/AuthContext'

function AdminInscriptas() {
  const location = useLocation()
  const { club: clubCuenta } = useAuth()

  const {
    gimnastasInscriptas = [],
    niveles = [],
    categorias = []
  } = location.state || {}

  const [inscriptas, setInscriptas] = useState(gimnastasInscriptas)
  const [busqueda, setBusqueda] = useState('')
  const [filtroClub, setFiltroClub] = useState('')
const [filtroNivel, setFiltroNivel] = useState('')
const [filtroCategoria, setFiltroCategoria] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editApellido, setEditApellido] = useState('')
  const [editClub, setEditClub] = useState('')
  const [editProfe, setEditProfe] = useState('')
  const [editNivelId, setEditNivelId] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')

  const normalizarTexto = (texto) =>
    String(texto || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  function existeDuplicada({ nombre, apellido, nivelId, categoriaId, ignorarGimnastaId }) {
    return inscriptas.some((inscripcion) => {
      const g = inscripcion.gimnastas

      if (!g || g.id === ignorarGimnastaId) return false

      return (
        normalizarTexto(g.nombre) === normalizarTexto(nombre) &&
        normalizarTexto(g.apellido) === normalizarTexto(apellido) &&
        Number(g.nivel_id) === Number(nivelId) &&
        Number(g.categoria_id) === Number(categoriaId)
      )
    })
  }

  function iniciarEdicion(inscripcion) {
    const g = inscripcion.gimnastas

    setEditandoId(g.id)
    setEditNombre(g.nombre || '')
    setEditApellido(g.apellido || '')
    setEditClub(g.club || '')
    setEditProfe(g.profe || '')
    setEditNivelId(g.nivel_id || '')
    setEditCategoriaId(g.categoria_id || '')
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEditNombre('')
    setEditApellido('')
    setEditClub('')
    setEditProfe('')
    setEditNivelId('')
    setEditCategoriaId('')
  }

  async function guardarEdicion(gimnastaId) {
    if (!editNombre || !editApellido || !editNivelId || !editCategoriaId) {
      alert('Completá nombre, apellido, nivel y categoría')
      return
    }

    const duplicada = existeDuplicada({
      nombre: editNombre,
      apellido: editApellido,
      nivelId: editNivelId,
      categoriaId: editCategoriaId,
      ignorarGimnastaId: gimnastaId
    })

    if (duplicada) {
      alert('Ya existe otra gimnasta con ese nombre, apellido, nivel y categoría.')
      return
    }

    const { error } = await supabase
      .from('gimnastas')
      .update({
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        club: editClub.trim(),
        profe: editProfe.trim(),
        nivel_id: Number(editNivelId),
        categoria_id: Number(editCategoriaId)
      })
      .eq('id', gimnastaId)

    if (error) {
      console.log(error)
      alert('Error al editar gimnasta')
      return
    }

    const nivelNombre =
      niveles.find((n) => String(n.id) === String(editNivelId))?.nombre || ''

    const categoriaNombre =
      categorias.find((c) => String(c.id) === String(editCategoriaId))?.nombre || ''

    await supabase
      .from('cargas_manuales')
      .update({
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        club: editClub.trim(),
        profe: editProfe.trim(),
        nivel: nivelNombre,
        categoria: categoriaNombre
      })
      .eq('gimnasta_id', gimnastaId)

    setInscriptas((prev) =>
      prev.map((inscripcion) => {
        const g = inscripcion.gimnastas

        if (!g || g.id !== gimnastaId) return inscripcion

        return {
          ...inscripcion,
          gimnastas: {
            ...g,
            nombre: editNombre.trim(),
            apellido: editApellido.trim(),
            club: editClub.trim(),
            profe: editProfe.trim(),
            nivel_id: Number(editNivelId),
            categoria_id: Number(editCategoriaId),
            niveles: {
              nombre: nivelNombre
            },
            categorias: {
              nombre: categoriaNombre
            }
          }
        }
      })
    )

    alert('Gimnasta editada')
    cancelarEdicion()
  }

  async function eliminarGimnasta(inscripcion) {
    const g = inscripcion.gimnastas

    if (!g) return

    const confirmar = window.confirm(
      `¿Eliminar a ${g.apellido}, ${g.nombre}? También se borrarán sus puntajes cargados.`
    )

    if (!confirmar) return

    const { error: errorPuntajes } = await supabase
      .from('puntajes')
      .delete()
      .eq('gimnasta_id', g.id)

    if (errorPuntajes) {
      console.log(errorPuntajes)
      alert('Error al eliminar puntajes')
      return
    }

    await supabase
      .from('cargas_manuales')
      .delete()
      .eq('gimnasta_id', g.id)

    const { error: errorInscripcion } = await supabase
      .from('inscripciones')
      .delete()
      .eq('id', inscripcion.id)

    if (errorInscripcion) {
      console.log(errorInscripcion)
      alert('Error al eliminar inscripción')
      return
    }

    const { error: errorGimnasta } = await supabase
      .from('gimnastas')
      .delete()
      .eq('id', g.id)

    if (errorGimnasta) {
      console.log(errorGimnasta)
      alert('Error al eliminar gimnasta')
      return
    }

    setInscriptas((prev) =>
      prev.filter((item) => item.id !== inscripcion.id)
    )

    alert('Gimnasta eliminada')
  }

  const descargarExcel = () => {
  const datos = filtradas.map((inscripcion) => {
    const g = inscripcion.gimnastas

    return {
      Apellido: g?.apellido || '',
      Nombre: g?.nombre || '',
      Club: g?.club || '',
      Profe: g?.profe || '',
      Nivel: g?.niveles?.nombre || '',
      Categoria: g?.categorias?.nombre || ''
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(datos)

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Inscriptas'
  )

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  })

  const fileData = new Blob(
    [excelBuffer],
    {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  )

  saveAs(fileData, 'inscriptas.xlsx')
}
const clubes = Array.from(
  new Set(
    inscriptas
      .map((i) => i.gimnastas?.club)
      .filter(Boolean)
  )
).sort()

  const filtradas = inscriptas.filter((inscripcion) => {
  const g = inscripcion.gimnastas

  const texto =
    `${g?.apellido} ${g?.nombre} ${g?.club}`
      .toLowerCase()

  const cumpleBusqueda =
    texto.includes(busqueda.toLowerCase())

  const cumpleClub =
    filtroClub === '' ||
    g?.club === filtroClub

  const cumpleNivel =
    filtroNivel === '' ||
    String(g?.nivel_id) === String(filtroNivel)

  const cumpleCategoria =
    filtroCategoria === '' ||
    String(g?.categoria_id) === String(filtroCategoria)

  return (
    cumpleBusqueda &&
    cumpleClub &&
    cumpleNivel &&
    cumpleCategoria
  )
})

  return (
    <div className="inscriptas-page">
      <header className="inscriptas-header">
        {clubCuenta?.logo_url && (
          <img
            className="inscriptas-logo"
            src={clubCuenta.logo_url}
            alt={clubCuenta.nombre || 'Club'}
          />
        )}
        <h1>Gimnastas inscriptas</h1>
        {clubCuenta?.nombre && <p>{clubCuenta.nombre}</p>}
      </header>

      <main className="container admin-page inscriptas-content">
      <div className="admin-box inscriptas-box">
        <input
          type="text"
          placeholder="Buscar por apellido, nombre o club..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div
  style={{
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '15px'
  }}
>

  <select
    value={filtroClub}
    onChange={(e) => setFiltroClub(e.target.value)}
  >
    <option value="">Todos los clubes</option>

    {clubes.map((club) => (
      <option
        key={club}
        value={club}
      >
        {club}
      </option>
    ))}
  </select>

  <select
    value={filtroNivel}
    onChange={(e) => setFiltroNivel(e.target.value)}
  >
    <option value="">Todos los niveles</option>

    {niveles.map((nivel) => (
      <option
        key={nivel.id}
        value={nivel.id}
      >
        {nivel.nombre}
      </option>
    ))}
  </select>

  <select
    value={filtroCategoria}
    onChange={(e) => setFiltroCategoria(e.target.value)}
  >
    <option value="">Todas las categorías</option>

    {categorias.map((categoria) => (
      <option
        key={categoria.id}
        value={categoria.id}
      >
        {categoria.nombre}
      </option>
    ))}
  </select>

</div>
        <button
  onClick={descargarExcel}
  className="btn btn-success"
  style={{ marginTop: '10px', marginBottom: '15px' }}
>
  Descargar Excel
</button>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Profe</th>
                <th>Nivel</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((inscripcion) => {
                const g = inscripcion.gimnastas
                const estaEditando = editandoId === g?.id

                return (
                  <tr key={inscripcion.id}>
                    {estaEditando ? (
                      <>
                        <td>
                          <input
                            value={editApellido}
                            onChange={(e) => setEditApellido(e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            value={editClub}
                            onChange={(e) => setEditClub(e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            value={editProfe}
                            onChange={(e) => setEditProfe(e.target.value)}
                          />
                        </td>

                        <td>
                          <select
                            value={editNivelId}
                            onChange={(e) => setEditNivelId(e.target.value)}
                          >
                            {niveles.map((nivel) => (
                              <option key={nivel.id} value={nivel.id}>
                                {nivel.nombre}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <select
                            value={editCategoriaId}
                            onChange={(e) => setEditCategoriaId(e.target.value)}
                          >
                            {categorias.map((categoria) => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.nombre}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <div className="table-buttons">
                            <button onClick={() => guardarEdicion(g.id)}>
                              Guardar
                            </button>

                            <button className="danger" onClick={cancelarEdicion}>
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{g?.apellido}</td>
                        <td>{g?.nombre}</td>
                        <td>{g?.club}</td>
                        <td>{g?.profe}</td>
                        <td>{g?.niveles?.nombre}</td>
                        <td>{g?.categorias?.nombre}</td>

                        <td>
                          <div className="table-buttons">
                            <button onClick={() => iniciarEdicion(inscripcion)}>
                              Editar
                            </button>

                            <button
                              className="danger"
                              onClick={() => eliminarGimnasta(inscripcion)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtradas.length === 0 && (
          <p style={{ marginTop: '16px' }}>
            No hay gimnastas inscriptas.
          </p>
        )}
      </div>
      </main>

      <style>{`
        .inscriptas-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 55%, color-mix(in srgb, var(--color-primario) 12%, white) 100%);
          color: #242424;
          padding-bottom: 30px;
        }

        .inscriptas-header {
          background: linear-gradient(135deg, var(--color-primario), var(--color-secundario));
          color: white;
          text-align: center;
          padding: 26px 16px;
          border-bottom: 5px solid var(--color-primario);
        }

        .inscriptas-header h1 {
          margin: 0;
          color: white;
        }

        .inscriptas-header p {
          margin: 7px 0 0;
          font-weight: 800;
        }

        .inscriptas-logo {
          width: 68px;
          height: 68px;
          object-fit: contain;
          border-radius: 14px;
          background: white;
          padding: 6px;
          margin-bottom: 10px;
        }

        .inscriptas-content {
          width: min(1300px, calc(100% - 24px)) !important;
          max-width: 1300px !important;
          margin: 24px auto !important;
        }

        .inscriptas-box {
          background: white !important;
          border-radius: 20px !important;
          padding: 20px !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.10);
        }

        .inscriptas-page .admin-table th {
          background: var(--color-primario) !important;
          color: white !important;
        }

        .inscriptas-page button:not(.danger) {
          background: var(--color-primario) !important;
          color: white !important;
        }

        .inscriptas-page button:not(.danger):hover {
          background: var(--color-secundario) !important;
        }

        .inscriptas-page input:focus,
        .inscriptas-page select:focus {
          outline: none;
          border-color: var(--color-primario);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primario) 15%, transparent);
        }

        @media (max-width: 700px) {
          .inscriptas-box {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminInscriptas