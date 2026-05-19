import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../services/supabase'

function Home() {

  const [torneos, setTorneos] = useState([])

  async function obtenerTorneos() {

    const { data, error } = await supabase
      .from('torneos')
      .select('*')

    if (error) {
      console.log(error)
    } else {
      setTorneos(data)
    }
  }

  useEffect(() => {
    obtenerTorneos()
  }, [])

  return (
    <div className="container">

      <h1>Sistema de Torneos</h1>

      <div className="buttons">

        <Link to="/admin">
          <button>Soy Admin</button>
        </Link>

        <Link to="/jueces">
          <button>Soy Juez</button>
        </Link>

        <Link to="/resultados">
          <button>Soy Espectador</button>
        </Link>

      </div>

      <div style={{ marginTop: '40px' }}>

        <h2>Torneos disponibles</h2>

        {
          torneos.map((torneo) => (
            <div key={torneo.id}>
              <p>
                {torneo.nombre} 
              </p>
            </div>
          ))
        }

      </div>

    </div>
  )
}

export default Home