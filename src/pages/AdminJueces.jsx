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

    const canal = supabase
      .channel('admin-jueces-en-vivo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'juez_grupos'
        },
        () => obtenerJueces()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  async function reabrirGrupo(grupo) {
  const confirmar = window.confirm(
    `¿Reabrir el grupo de ${grupo.jueces?.nombre}?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('juez_grupos')
    .update({ finalizado: false })
    .eq('id', grupo.id)

  if (error) {
    console.log(error)
    alert('No se pudo reabrir el grupo')
    return
  }

  alert('Grupo reabierto. La jueza debe salir y volver a entrar al grupo.')
  obtenerJueces()
}

  return (
    <div className="container admin-page">
      <h1>Jueces logueados</h1>
      <button onClick={obtenerJueces}>
  Actualizar
</button>

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
                  <th>Acciones</th>
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
                    <td>
  {grupo.finalizado ? (
    <button onClick={() => reabrirGrupo(grupo)}>
      Reabrir grupo
    </button>
  ) : (
    <span>Activo</span>
  )}
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