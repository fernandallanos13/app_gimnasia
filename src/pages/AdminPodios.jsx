import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../services/supabase'

function AdminPodios() {
  const location = useLocation()

  const {
    puntajesCargados = [],
    gimnastasInscriptas = []
  } = location.state || {}

  const [busqueda, setBusqueda] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [clubFiltro, setClubFiltro] = useState('')
  const [gruposAbiertos, setGruposAbiertos] = useState({})
  const [estados, setEstados] = useState({})

  const agrupados = {}

  gimnastasInscriptas.forEach((inscripcion) => {
    const g = inscripcion.gimnastas
    if (!g) return

    const clave = `${g.apellido}-${g.nombre}-${g.club}`

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
  })

  puntajesCargados.forEach((p) => {
    const g = p.gimnastas
    const aparato = p.aparatos?.nombre

    if (!g || !aparato) return

    const clave = `${g.apellido}-${g.nombre}-${g.club}`

    if (!agrupados[clave]) return

    agrupados[clave][aparato] = p.puntaje
    agrupados[clave].total = Number(
      (agrupados[clave].total + Number(p.puntaje || 0)).toFixed(2)
    )
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
      const nivelA = numeroNivel(a.nivel)
      const nivelB = numeroNivel(b.nivel)

      if (nivelA !== nivelB) return nivelA - nivelB
      if (a.categoria !== b.categoria) return String(a.categoria || '').localeCompare(String(b.categoria || ''))

      return Number(b.total) - Number(a.total)
    })

  const grupos = {}

  filasFiltradas.forEach((g) => {
    const clave = `${g.nivel} - ${g.categoria}`

    if (!grupos[clave]) grupos[clave] = []

    grupos[clave].push(g)
  })

  function esMiniatura(categoria) {
    return String(categoria || '').toLowerCase().includes('miniatura')
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

  function calcularPuestoAdmin(gimnasta, lista, nivel, categoria) {
    const nivelTexto = String(nivel || '').toUpperCase().trim()

    if (esMiniatura(categoria)) return '🙂'

    const total = lista.length
    const puntaje = Number(gimnasta.total || 0)
    const posicionPorPuntaje =
      lista.filter((item) => Number(item.total || 0) > puntaje).length + 1
    const indexPorPuntaje = posicionPorPuntaje - 1

    if (nivelTexto === 'N1') {
      const tercio = Math.ceil(total / 3)

      if (indexPorPuntaje < tercio) return '1°'
      if (indexPorPuntaje < tercio * 2) return '2°'
      return '3°'
    }

    if (nivelTexto === 'N2' || nivelTexto === 'N3') {
      if (posicionPorPuntaje <= 6) return `${posicionPorPuntaje}°`

      const restantes = Math.max(total - 6, 1)
      const posicionRestante = Math.max(posicionPorPuntaje - 7, 0)
      const cuarto = Math.ceil(restantes / 4)

      if (posicionRestante < cuarto) return '7°'
      if (posicionRestante < cuarto * 2) return '8°'
      if (posicionRestante < cuarto * 3) return '9°'
      return '10°'
    }

    return `${posicionPorPuntaje}°`
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

  async function cambiarEstado(nivel, categoria, estado) {
    const { error } = await supabase
      .from('estados_resultados')
      .upsert(
        {
          nivel,
          categoria,
          estado
        },
        {
          onConflict: 'nivel,categoria'
        }
      )

    if (error) {
      console.log(error)
      alert('Error al cambiar estado')
      return
    }

    cargarEstados()
  }

  async function cargarEstados() {
    const { data, error } = await supabase
      .from('estados_resultados')
      .select('*')

    if (error) {
      console.log(error)
      return
    }

    const mapa = {}

    ;(data || []).forEach((e) => {
      mapa[`${e.nivel} - ${e.categoria}`] = e.estado
    })

    setEstados(mapa)
  }

  useEffect(() => {
    cargarEstados()
  }, [])

  function exportarPodiosExcel() {
    const datosExcel = [...filasFiltradas].map((g, index) => ({
      Puesto: calcularPuestoAdmin(g, filasFiltradas, g.nivel, g.categoria),
      Apellido: g.apellido,
      Nombre: g.nombre,
      Club: g.club,
      Nivel: g.nivel,
      Categoria: g.categoria,
      Suelo: mostrarPuntaje(g.Suelo, g.categoria),
      Salto: mostrarPuntaje(g.Salto, g.categoria),
      Viga: mostrarPuntaje(g.Viga, g.categoria),
      Paralelas: mostrarPuntaje(g.Paralelas, g.categoria),
      Total: esMiniatura(g.categoria)
        ? '🙂'
        : Number(g.total || 0).toFixed(2)
    }))

    const hoja = XLSX.utils.json_to_sheet(datosExcel)
    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(libro, hoja, 'Podios')
    XLSX.writeFile(libro, 'podios-resultados.xlsx')
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
              <option key={nivel} value={nivel}>{nivel}</option>
            ))}
          </select>

          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>

          <select value={clubFiltro} onChange={(e) => setClubFiltro(e.target.value)}>
            <option value="">Todos los clubes</option>
            {clubes.map((club) => (
              <option key={club} value={club}>{club}</option>
            ))}
          </select>

          <button onClick={limpiarFiltros}>Limpiar filtros</button>
          <button onClick={exportarPodiosExcel}>Descargar Excel filtrado</button>
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
          const claveEstado = `${gimnastas[0]?.nivel} - ${gimnastas[0]?.categoria}`
          const estadoActual = estados[claveEstado] || 'pendiente'

          const colorEstado =
            estadoActual === 'finalizado'
              ? '#19eb19'
              : estadoActual === 'cargando'
                ? '#f77f00'
                : '#d62828'

          return (
            <div
              className="result-category-card podio-card"
              key={grupo}
              style={{ borderLeft: `12px solid ${colorEstado}` }}
            >
              {/* ← HEADER: todo en una línea */}
              <div
                className="podio-header"
                onClick={() => toggleGrupo(grupo)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  background: '#c81020',
                  borderRadius: '12px',
                  color: 'white',
                  minHeight: 'auto'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span style={{ flexShrink: 0 }}>{abierto ? '−' : '+'}</span>
                  <strong style={{ fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {grupo}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontSize: '16px', whiteSpace: 'nowrap' }}>
                  <span>{gimnastas.length} gim.</span>
                  <span>|</span>
                  <span>{estadoActual}</span>
                </div>
              </div>

              {/* ← BOTONES DE ESTADO: fuera del header */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', marginTop: '8px', marginBottom: '6px' }}>
  <button
    style={{ fontSize: '13px', padding: '5px 10px', minWidth: '40px', maxWidth: '75px', borderRadius: '6px' }}
    onClick={() => cambiarEstado(gimnastas[0]?.nivel, gimnastas[0]?.categoria, 'pendiente')}>
    Pend.
  </button>

  <button
    style={{ fontSize: '13px', padding: '5px 10px', minWidth: '40px', maxWidth: '75px', borderRadius: '6px' }}
    onClick={() => cambiarEstado(gimnastas[0]?.nivel, gimnastas[0]?.categoria, 'cargando')}>
    Cargando
  </button>

  <button
    style={{ fontSize: '13px', padding: '5px 10px', minWidth: '40px', maxWidth: '75px', borderRadius: '6px' }}
    onClick={() => cambiarEstado(gimnastas[0]?.nivel, gimnastas[0]?.categoria, 'finalizado')}>
    Final.
  </button>
</div>

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
                              {calcularPuestoAdmin(g, gimnastas, g.nivel, g.categoria)}
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
                              {esMiniatura(g.categoria)
                                ? '🙂'
                                : Number(g.total || 0).toFixed(2)}
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
