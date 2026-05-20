import { useLocation } from 'react-router-dom'
import { useState } from 'react'

function AdminPodios() {
  const location = useLocation()

  const { puntajesCargados = [] } = location.state || {}

  const [busqueda, setBusqueda] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [clubFiltro, setClubFiltro] = useState('')

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
        club: g.club || '',
        nivel: g.niveles?.nombre || '',
        categoria: g.categorias?.nombre || '',
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

  const filasBase = Object.values(agrupados)

  const niveles = [...new Set(filasBase.map((g) => g.nivel).filter(Boolean))]
  const categorias = [...new Set(filasBase.map((g) => g.categoria).filter(Boolean))]
  const clubes = [...new Set(filasBase.map((g) => g.club).filter(Boolean))]

  const filasFiltradas = filasBase
    .filter((g) => {
      const texto = `${g.apellido} ${g.nombre} ${g.club}`.toLowerCase()

      return (
        texto.includes(busqueda.toLowerCase()) &&
        (!nivelFiltro || g.nivel === nivelFiltro) &&
        (!categoriaFiltro || g.categoria === categoriaFiltro) &&
        (!clubFiltro || g.club === clubFiltro)
      )
    })
    .sort((a, b) => {
      if (a.nivel !== b.nivel) return a.nivel.localeCompare(b.nivel)
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria)
      return b.total - a.total
    })

  const grupos = {}

  filasFiltradas.forEach((g) => {
    const clave = `${g.nivel} - ${g.categoria}`

    if (!grupos[clave]) grupos[clave] = []

    grupos[clave].push(g)
  })

  function esMiniaturas(categoria) {
    return categoria === 'Miniaturas'
  }

  function mostrarPuntaje(valor, categoria) {
    if (esMiniaturas(categoria)) {
      return Number(valor) > 0 ? '🙂' : ''
    }

    return valor || ''
  }

  function limpiarFiltros() {
    setBusqueda('')
    setNivelFiltro('')
    setCategoriaFiltro('')
    setClubFiltro('')
  }

  return (
    <div className="container admin-page">
      <h1>Podios y resultados</h1>

      <div className="admin-box">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o club..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="podios-filter-grid">
          <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
            <option value="">Todos los niveles</option>
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>

          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>

          <select value={clubFiltro} onChange={(e) => setClubFiltro(e.target.value)}>
            <option value="">Todos los clubes</option>
            {clubes.map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>

          <button onClick={limpiarFiltros}>Limpiar filtros</button>
        </div>
      </div>

      {Object.entries(grupos).map(([grupo, gimnastas]) => (
        <div className="result-category-card" key={grupo}>
          <h2>{grupo}</h2>

          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Puesto</th>
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
                {gimnastas.map((g, index) => (
                  <tr key={`${g.apellido}-${g.nombre}-${g.club}`}>
                    <td>
                      <strong>
                        {esMiniaturas(g.categoria) ? '🙂' : `${index + 1}°`}
                      </strong>
                    </td>
                    <td>{g.apellido}</td>
                    <td>{g.nombre}</td>
                    <td>{g.club}</td>
                    <td>{mostrarPuntaje(g.Suelo, g.categoria)}</td>
                    <td>{mostrarPuntaje(g.Salto, g.categoria)}</td>
                    <td>{mostrarPuntaje(g.Viga, g.categoria)}</td>
                    <td>{mostrarPuntaje(g.Paralelas, g.categoria)}</td>
                    <td>
                      <strong>{esMiniaturas(g.categoria) ? '🙂' : g.total}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(grupos).length === 0 && (
        <p>No hay resultados para mostrar con esos filtros.</p>
      )}
    </div>
  )
}

export default AdminPodios