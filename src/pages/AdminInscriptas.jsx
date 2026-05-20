import { useLocation } from 'react-router-dom'
import { useState } from 'react'

function AdminInscriptas() {

  const location = useLocation()

  const {
    gimnastasInscriptas = [],
    niveles = [],
    categorias = []
  } = location.state || {}

  const [busqueda, setBusqueda] = useState('')

  const filtradas = gimnastasInscriptas.filter((inscripcion) => {

    const g = inscripcion.gimnastas

    const texto =
      `${g?.apellido} ${g?.nombre} ${g?.club}`
        .toLowerCase()

    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div className="container admin-page">

      <h1>Gimnastas inscriptas</h1>

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
                <th>Profe</th>
                <th>Nivel</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>

              {filtradas.map((inscripcion) => {

                const g = inscripcion.gimnastas

                return (
                  <tr key={inscripcion.id}>

                    <td>{g?.apellido}</td>
                    <td>{g?.nombre}</td>
                    <td>{g?.club}</td>
                    <td>{g?.profe}</td>
                    <td>{g?.niveles?.nombre}</td>
                    <td>{g?.categorias?.nombre}</td>

                    <td>

                      <div className="table-buttons">

                        <button>
                          Editar
                        </button>

                        <button className="danger">
                          Eliminar
                        </button>

                      </div>

                    </td>

                  </tr>
                )
              })}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}

export default AdminInscriptas