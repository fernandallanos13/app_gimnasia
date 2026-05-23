import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../services/supabase'

function AdminPuntajes() {
  const location = useLocation()

  const { puntajesCargados = [] } = location.state || {}

  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [valoresEditados, setValoresEditados] = useState({})

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
        nivel: g.niveles?.nombre || '',
categoria: g.categorias?.nombre || '',

        Suelo: '',
        Salto: '',
        Viga: '',
        Paralelas: '',
        total: 0,
        puntajesIds: {}
      }
    }

    agrupados[clave][aparato] = p.puntaje
    agrupados[clave].puntajesIds[aparato] = p.id
    agrupados[clave].total += Number(p.puntaje)
  })

  const filas = Object.values(agrupados).filter((g) => {
    const texto = `${g.apellido} ${g.nombre} ${g.club}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  function iniciarEdicion(g) {
    const clave = `${g.apellido}-${g.nombre}-${g.club}`
    setEditando(clave)

    setValoresEditados({
      Suelo: g.Suelo,
      Salto: g.Salto,
      Viga: g.Viga,
      Paralelas: g.Paralelas
    })
  }

  function cancelarEdicion() {
    setEditando(null)
    setValoresEditados({})
  }

  async function guardarEdicion(g) {
    const aparatos = ['Suelo', 'Salto', 'Viga', 'Paralelas']

    for (const aparato of aparatos) {
      const puntajeId = g.puntajesIds[aparato]
      const valor = valoresEditados[aparato]

      if (!puntajeId || valor === '') continue

      if (Number(valor) < 0 || Number(valor) > 99) {
        alert('Los puntajes deben estar entre 0 y 99')
        return
      }

      const { error } = await supabase
        .from('puntajes')
        .update({ puntaje: Number(valor) })
        .eq('id', puntajeId)

      if (error) {
        console.log(error)
        alert('Error al editar puntaje')
        return
      }
    }

    alert('Puntajes editados. Volvé a entrar para verlos actualizados.')
    setEditando(null)
  }

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
                <th>Nivel</th>
<th>Categoría</th>
                <th>Suelo</th>
                <th>Salto</th>
                <th>Viga</th>
                <th>Paralelas</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filas.map((g) => {
                const clave = `${g.apellido}-${g.nombre}-${g.club}`
                const estaEditando = editando === clave

                return (
                  <tr key={clave}>
                    <td>{g.apellido}</td>
<td>{g.nombre}</td>
<td>{g.club}</td>
<td>{g.nivel}</td>
<td>{g.categoria}</td>
                    

                    {['Suelo', 'Salto', 'Viga', 'Paralelas'].map((aparato) => (
                      <td key={aparato}>
                        {estaEditando && g.puntajesIds[aparato] ? (
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={valoresEditados[aparato]}
                            onChange={(e) =>
                              setValoresEditados({
                                ...valoresEditados,
                                [aparato]: e.target.value
                              })
                            }
                          />
                        ) : (
                          g[aparato]
                        )}
                      </td>
                    ))}

                    <td>
                      <strong>
                        {estaEditando
                          ? Object.values(valoresEditados).reduce(
                              (acc, val) => acc + Number(val || 0),
                              0
                            )
                          : g.total}
                      </strong>
                    </td>

                    <td>
                      {estaEditando ? (
                        <div className="table-buttons">
                          <button onClick={() => guardarEdicion(g)}>
                            Guardar
                          </button>
                          <button className="danger" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => iniciarEdicion(g)}>
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
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