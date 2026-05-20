import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="container">
      <h1>Sistema de Torneos de Gimnasia</h1>

      <div className="buttons">
        <Link to="/admin-login">
          <button>Soy Admin</button>
        </Link>

        <Link to="/jueces">
          <button>Soy Juez</button>
        </Link>

        <Link to="/resultados">
          <button>Soy Espectador</button>
        </Link>
      </div>
    </div>
  )
}

export default Home