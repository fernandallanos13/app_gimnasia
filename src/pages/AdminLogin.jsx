import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

function AdminLogin() {

  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function iniciarSesion() {

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert('Email o contraseña incorrectos')
      console.log(error)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="container">

      <h1>Login Admin</h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '300px'
        }}
      >

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={iniciarSesion}>
          Ingresar
        </button>

      </div>

    </div>
  )
}

export default AdminLogin