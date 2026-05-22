import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

function AdminPodios() {
  const location = useLocation()

  const { puntajesCargados = [] } = location.state || {}

  const [busqueda, setBusqueda] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [clubFiltro, setClubFiltro] = useState('')
  const navigate = useNavigate() 
  const [gruposAbiertos, setGruposAbiertos] = useState({})
  
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

  function esMiniatura(categoria) {
    return categoria === 'Miniatura'
  }

  function mostrarPuntaje(valor, categoria) {
    if (esMiniatura(categoria)) {
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
function calcularPuestoAdmin(index, total, nivel, categoria) {
  const nivelTexto = String(nivel || '').toUpperCase().trim()
  const categoriaTexto = String(categoria || '').toLowerCase().trim()

  if (categoriaTexto.includes('miniaturas')) {
    return '🙂'
  }

  if (nivelTexto === 'N1') {
    const tercio = Math.ceil(total / 3)

    if (index < tercio) return '1°'
    if (index < tercio * 2) return '2°'
    return '3°'
  }

  if (nivelTexto === 'N2' || nivelTexto === 'N3') {
    if (index < 6) return `${index + 1}°`

    const restantes = total - 6
    const posicionRestante = index - 6
    const cuarto = Math.ceil(restantes / 4)

    if (posicionRestante < cuarto) return '7°'
    if (posicionRestante < cuarto * 2) return '8°'
    if (posicionRestante < cuarto * 3) return '9°'
    return '10°'
  }

  return `${index + 1}°`
}

function numeroNivel(nivel) {
  const match = String(nivel || '').match(/\d+/)
  return match ? Number(match[0]) : 999
}

function toggleGrupo(grupo) {
  setGruposAbiertos({
    ...gruposAbiertos,
    [grupo]: !gruposAbiertos[grupo]
  })
}

function exportarPodiosExcel() {
  const datosExcel = filasFiltradas.map((g, index) => ({
    Puesto: calcularPuestoAdmin(index, filasFiltradas.length, g.nivel, g.categoria),
    Apellido: g.apellido,
    Nombre: g.nombre,
    Club: g.club,
    Nivel: g.nivel,
    Categoria: g.categoria,
    Suelo: mostrarPuntaje(g.Suelo, g.categoria),
    Salto: mostrarPuntaje(g.Salto, g.categoria),
    Viga: mostrarPuntaje(g.Viga, g.categoria),
    Paralelas: mostrarPuntaje(g.Paralelas, g.categoria),
    Total: esMiniatura(g.categoria) ? '🙂' : g.total
  }))

  const hoja = XLSX.utils.json_to_sheet(datosExcel)
  const libro = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(libro, hoja, 'Podios')

  XLSX.writeFile(libro, 'podios-resultados.xlsx')
}
  return (
    <div className="container admin-page">
      <h1>Podios y resultados</h1>
      <button onClick={() => navigate('/admin/puntajes')}>
  Editar puntajes
</button>

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
          <button onClick={exportarPodiosExcel}>
  Descargar Excel filtrado
</button>
        </div>
      </div>

      {Object.entries(grupos)
  .sort(([grupoA, gimnastasA], [grupoB, gimnastasB]) => {
    const nivelA = numeroNivel(gimnastasA[0]?.nivel)
    const nivelB = numeroNivel(gimnastasB[0]?.nivel)

    if (nivelA !== nivelB) return nivelA - nivelB

    return grupoA.localeCompare(grupoB)
  })
  .map(([grupo, gimnastas]) => {
    const abierto = gruposAbiertos[grupo]

    return (
      <div className="result-category-card" key={grupo}>
        <button
          className="result-category-header"
          onClick={() => toggleGrupo(grupo)}
        >
          <span>{abierto ? '−' : '+'}</span>
          <strong>{grupo}</strong>
          <small>{gimnastas.length} gimnasta(s)</small>
        </button>

        {abierto && (
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
                        {calcularPuestoAdmin(
                          index,
                          gimnastas.length,
                          g.nivel,
                          g.categoria
                        )}
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
                      <strong>
                        {esMiniatura(g.categoria) ? '🙂' : g.total}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  })}
      {Object.keys(grupos).length === 0 && (
        <p>No hay resultados para mostrar con esos filtros.</p>
      )}
    </div>
  )
}

export default AdminPodios