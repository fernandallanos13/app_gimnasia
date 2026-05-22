import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function AdminJueces() {
  const [grupos, setGrupos] = useState([])

  async function obtenerJueces() {
    const { data, error } = await supabase
      .from('juez_grupos')
      .select(`
        id,
        finalizado,
        jueces (nombre),
        aparatos (nombre),
        niveles (nombre),
        categorias (nombre)
      `)
      .order('id', { ascending: false })

    if (error) {
      console.log(error)
      alert('Error al traer jueces')
      return
    }

    setGrupos(data)
  }

  useEffect(() => {
    obtenerJueces()
  }, [])

  return (
    <div className="container admin-page">
      <h1>Jueces logueados</h1>

      <div className="admin-box">
        {grupos.length === 0 ? (
          <p>No hay jueces cargando grupos todavía.</p>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Juez</th>
                  <th>Aparato</th>
                  <th>Nivel</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {grupos.map((grupo) => (
                  <tr key={grupo.id}>
                    <td>{grupo.jueces?.nombre}</td>
                    <td>{grupo.aparatos?.nombre}</td>
                    <td>{grupo.niveles?.nombre}</td>
                    <td>{grupo.categorias?.nombre}</td>
                    <td>
                      {grupo.finalizado ? 'Finalizado' : 'Cargando'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminJueces