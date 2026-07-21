import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../services/supabase'

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
    nombre: partes.slice(0, -1).join(' '),
    apellido: partes.slice(-1).join(' ')
  }
}

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function AdminInscripciones() {
  const [inscripciones, setInscripciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroClub, setFiltroClub] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  async function obtenerInscripciones() {
    setCargando(true)

    const { data, error } = await supabase
      .from('pre_inscripciones')
      .select('*')
      .order('created_at', { ascending: false })

    setCargando(false)

    if (error) {
      console.error(error)
      alert('Error al traer preinscripciones')
      return
    }

    setInscripciones(data || [])
  }

  useEffect(() => {
    obtenerInscripciones()
  }, [])

  const clubes = useMemo(() => {
    return [...new Set(inscripciones.map((i) => i.club).filter(Boolean))].sort()
  }, [inscripciones])

  const niveles = useMemo(() => {
    return [...new Set(inscripciones.map((i) => i.nivel).filter(Boolean))].sort()
  }, [inscripciones])

  const categorias = useMemo(() => {
    return [...new Set(inscripciones.map((i) => i.categoria).filter(Boolean))].sort()
  }, [inscripciones])

  const filtradas = inscripciones.filter((i) => {
    const coincideClub = filtroClub ? i.club === filtroClub : true
    const coincideNivel = filtroNivel ? i.nivel === filtroNivel : true
    const coincideCategoria = filtroCategoria ? i.categoria === filtroCategoria : true

    return coincideClub && coincideNivel && coincideCategoria
  })

  function convertirParaExcel(lista) {
    return lista.map((item) => {
      const separado = separarNombreApellido(item.nombre_completo)

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
      alert('No hay inscripciones para descargar con esos filtros.')
      return
    }

    const datosExcel = convertirParaExcel(lista)

    const hoja = XLSX.utils.json_to_sheet(datosExcel)
    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(libro, hoja, 'Inscriptas')
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

  async function marcarComoImportadas() {
    if (filtradas.length === 0) {
      alert('No hay inscripciones filtradas para marcar.')
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
      alert('Error al marcar como importadas')
      return
    }

    alert('Inscripciones marcadas como importadas')
    obtenerInscripciones()
  }

  async function eliminarImportadas() {
  const importadas = inscripciones.filter((i) => i.estado === 'importada')

  if (importadas.length === 0) {
    alert('No hay preinscripciones marcadas como importadas.')
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
    alert('Error al eliminar las importadas')
    return
  }

  alert('Preinscripciones importadas eliminadas')
  obtenerInscripciones()
}

  async function eliminarInscripcion(id) {
    const confirmar = window.confirm('¿Eliminar esta preinscripción?')

    if (!confirmar) return

    const { error } = await supabase
      .from('pre_inscripciones')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('Error al eliminar')
      return
    }

    obtenerInscripciones()
  }

  return (
    <div className="admin-pre-page">
      <header className="admin-pre-header">
        <h1>Preinscripciones</h1>
        <p>Revisá, filtrá y descargá el Excel compatible con el sistema.</p>
      </header>

      <main className="admin-pre-container">
        <section className="admin-pre-card">
          <h2>Filtros</h2>

          <div className="filters-grid">
            <label>
              Club
              <select value={filtroClub} onChange={(e) => setFiltroClub(e.target.value)}>
                <option value="">Todos</option>
                {clubes.map((club) => (
                  <option key={club} value={club}>{club}</option>
                ))}
              </select>
            </label>

            <label>
              Nivel
              <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
                <option value="">Todos</option>
                {niveles.map((nivel) => (
                  <option key={nivel} value={nivel}>{nivel}</option>
                ))}
              </select>
            </label>

            <label>
              Categoría
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
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

            <button className="secondary" onClick={marcarComoImportadas}>
              Marcar como importadas
            </button>

            <div className="button-row">
            <button onClick={descargarFiltrado}>
              Descargar Excel
            </button>

            <button className="secondary" onClick={marcarComoImportadas}>
              Marcar como importadas
            </button>

            <button className="danger" onClick={eliminarImportadas}>
              Eliminar importadas
            </button>
          </div>
          </div>
        </section>

        <section className="admin-pre-card">
          <h2>Listado recibido</h2>

          {cargando ? (
            <p>Cargando...</p>
          ) : filtradas.length === 0 ? (
            <p>No hay preinscripciones con esos filtros.</p>
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
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filtradas.map((item) => (
                    <tr key={item.id}>
                      <td>{item.club}</td>
                      <td>{item.profe_responsable || '-'}</td>
                      <td>{item.nivel}</td>
                      <td>{item.categoria}</td>
                      <td>{item.nombre_completo}</td>
                      <td>{item.estado || 'pendiente'}</td>
                      <td>
                        <button
                          className="danger small"
                          onClick={() => eliminarInscripcion(item.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <style>{`
        .admin-pre-page {
          min-height: 100vh;
          background: #f4f4f4;
          color: #242424;
          padding-bottom: 30px;
        }

        .admin-pre-header {
          background: #151515;
          color: white;
          text-align: center;
          padding: 28px 16px;
          border-bottom: 5px solid #c1121f;
        }

        .admin-pre-header h1 {
          margin: 0;
          color: white;
        }

        .admin-pre-container {
          width: min(1200px, calc(100% - 24px));
          margin: 24px auto;
          display: grid;
          gap: 20px;
        }

        .admin-pre-card {
          background: white;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 28px rgba(0,0,0,.10);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        label {
          font-weight: 800;
        }

        select {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ccc;
          font-size: 15px;
        }

        .count-box {
          margin-top: 18px;
          background: #f7e7e8;
          border: 1px solid #efc4c8;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
          color: #9b0d17;
        }

        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }

        button {
          background: #c1121f;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 900;
          cursor: pointer;
        }

        button.secondary {
          background: white;
          color: #c1121f;
          border: 2px solid #c1121f;
        }

        button.danger {
          background: #333;
        }

        button.small {
          padding: 8px 10px;
          font-size: 12px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border-bottom: 1px solid #ddd;
          padding: 12px;
          text-align: left;
          white-space: nowrap;
        }

        th {
          background: #f1f1f1;
          color: #9b0d17;
          text-transform: uppercase;
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .button-row {
            flex-direction: column;
          }

          button {
            width: 100%;
          }
        }
       `}</style>
    </div>
  )
}

export default AdminInscripciones