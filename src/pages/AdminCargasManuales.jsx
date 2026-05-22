import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function AdminCargasManuales() {
  const [cargas, setCargas] = useState([])
  const [busqueda, setBusqueda] = useState('')

  async function obtenerCargas() {
    const { data, error } = await supabase
      .from('cargas_manuales')
      .select('*')
      .order('creado_en', { ascending: false })

    if (error) {
      console.log(error)
      alert('Error al traer cargas manuales')
      return
    }

    setCargas(data)
  }

  useEffect(() => {
    obtenerCargas()
  }, [])

  const filtradas = cargas.filter((c) => {
    const texto = `${c.apellido} ${c.nombre} ${c.club} ${c.nivel} ${c.categoria}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div className="container admin-page">
      <h1>Cargas manuales</h1>

      <div className="admin-box">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, club, nivel o categoría..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Profe</th>
                <th>Nivel</th>
                <th>Categoría</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((carga) => (
                <tr key={carga.id}>
                  <td>
                    {new Date(carga.creado_en).toLocaleString('es-AR')}
                  </td>
                  <td>{carga.apellido}</td>
                  <td>{carga.nombre}</td>
                  <td>{carga.club}</td>
                  <td>{carga.profe}</td>
                  <td>{carga.nivel}</td>
                  <td>{carga.categoria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtradas.length === 0 && (
          <p style={{ marginTop: '16px' }}>
            No hay cargas manuales registradas.
          </p>
        )}
      </div>
    </div>
  )
}

export default AdminCargasManuales