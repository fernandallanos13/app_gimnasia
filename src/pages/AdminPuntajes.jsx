import { useLocation } from 'react-router-dom'
import { useState } from 'react'

function AdminPuntajes() {
  const location = useLocation()

  const { puntajesCargados = [] } = location.state || {}

  const [busqueda, setBusqueda] = useState('')

  const agrupados = {}

  puntajesCargados.forEach((p) => {
    const g = p.gimnastas
    const aparato = p.aparatos?.nombre

    if (!g || !aparato) return

    const clave = `${g.apellido}-${g.nombre}-${g.club}`

    if (!agrupados[clave]) {
      agrupados[clave] = {
        apellido: g.apellido,
        nombre: g.nombre,
        club: g.club,
        Suelo: '',
        Salto: '',
        Viga: '',
        Paralelas: '',
        total: 0
      }
    }

    agrupados[clave][aparato] = p.puntaje
    agrupados[clave].total += Number(p.puntaje)
  })

  const filas = Object.values(agrupados).filter((g) => {
    const texto = `${g.apellido} ${g.nombre} ${g.club}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div className="container admin-page">
      <h1>Puntajes cargados</h1>

      <div className="admin-box">
        <input
          type="text"
          placeholder="Buscar por apellido, nombre o club..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Suelo</th>
                <th>Salto</th>
                <th>Viga</th>
                <th>Paralelas</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {filas.map((g, index) => (
                <tr key={index}>
                  <td>{g.apellido}</td>
                  <td>{g.nombre}</td>
                  <td>{g.club}</td>
                  <td>{g.Suelo}</td>
                  <td>{g.Salto}</td>
                  <td>{g.Viga}</td>
                  <td>{g.Paralelas}</td>
                  <td>
                    <strong>{g.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filas.length === 0 && (
          <p style={{ marginTop: '16px' }}>
            No hay puntajes cargados para mostrar.
          </p>
        )}
      </div>
    </div>
  )
}

export default AdminPuntajes