import { useLocation } from 'react-router-dom'

function AdminTotales() {
  const location = useLocation()
  const { gimnastasInscriptas = [] } = location.state || {}

  const gimnastas = gimnastasInscriptas
    .map((i) => i.gimnastas)
    .filter(Boolean)

  const niveles = [...new Set(gimnastas.map((g) => g.niveles?.nombre).filter(Boolean))]
    .sort((a, b) => {
      const na = Number(String(a).match(/\d+/)?.[0] || 999)
      const nb = Number(String(b).match(/\d+/)?.[0] || 999)
      return na - nb
    })

  const clubes = [...new Set(gimnastas.map((g) => g.club || 'Sin club'))].sort()

  function categoriasPorNivel(nivel) {
    return [...new Set(
      gimnastas
        .filter((g) => g.niveles?.nombre === nivel)
        .map((g) => g.categorias?.nombre)
        .filter(Boolean)
    )].sort()
  }

  function contar(nivel, categoria, club) {
    return gimnastas.filter((g) =>
      g.niveles?.nombre === nivel &&
      g.categorias?.nombre === categoria &&
      (g.club || 'Sin club') === club
    ).length
  }

  function totalClubNivel(nivel, club) {
    return gimnastas.filter((g) =>
      g.niveles?.nombre === nivel &&
      (g.club || 'Sin club') === club
    ).length
  }

  function totalCategoriaNivel(nivel, categoria) {
    return gimnastas.filter((g) =>
      g.niveles?.nombre === nivel &&
      g.categorias?.nombre === categoria
    ).length
  }

  function totalNivel(nivel) {
    return gimnastas.filter((g) => g.niveles?.nombre === nivel).length
  }

  function totalClubGeneral(club) {
    return gimnastas.filter((g) => (g.club || 'Sin club') === club).length
  }

  return (
    <div className="container admin-page">
      <h1>Totales por categoría</h1>

      {niveles.map((nivel) => {
        const categorias = categoriasPorNivel(nivel)

        return (
          <div className="totales-box" key={nivel}>
            <table className="totales-table">
              <thead>
                <tr>
                  <th rowSpan="2">Registro de Gimnastas</th>
                  <th colSpan={categorias.length + 1}>{nivel}</th>
                </tr>
                <tr>
                  {categorias.map((cat) => (
                    <th key={cat}>{cat}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {clubes.map((club) => (
                  <tr key={club}>
                    <td>{club}</td>

                    {categorias.map((cat) => (
                      <td key={cat}>{contar(nivel, cat, club)}</td>
                    ))}

                    <td className="total-red">
                      {totalClubNivel(nivel, club)}
                    </td>
                  </tr>
                ))}

                <tr>
                  <td><strong>Total por Nivel</strong></td>

                  {categorias.map((cat) => (
                    <td key={cat}>
                      <strong>{totalCategoriaNivel(nivel, cat)}</strong>
                    </td>
                  ))}

                  <td className="total-red">
                    <strong>{totalNivel(nivel)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}

      <div className="totales-box">
        <table className="totales-table">
          <thead>
            <tr>
              <th>Registro de Gimnastas</th>
              {niveles.map((nivel) => (
                <th key={nivel}>{nivel}</th>
              ))}
              <th>Total Club</th>
            </tr>
          </thead>

          <tbody>
            {clubes.map((club) => (
              <tr key={club}>
                <td>{club}</td>

                {niveles.map((nivel) => (
                  <td key={nivel}>{totalClubNivel(nivel, club)}</td>
                ))}

                <td className="total-red">
                  <strong>{totalClubGeneral(club)}</strong>
                </td>
              </tr>
            ))}

            <tr>
              <td><strong>Total por Nivel</strong></td>

              {niveles.map((nivel) => (
                <td key={nivel}>
                  <strong>{totalNivel(nivel)}</strong>
                </td>
              ))}

              <td className="total-red">
                <strong>{gimnastas.length}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminTotales