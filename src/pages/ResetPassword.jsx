import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function guardarNuevaPassword() {
    if (!password || password.length < 6) {
      alert('La contraseña tiene que tener al menos 6 caracteres')
      return
    }

    if (password !== confirmarPassword) {
      alert('Las dos contraseñas no coinciden')
      return
    }

    setGuardando(true)

    // Cuando se llega acá desde el link del mail de recuperación,
    // Supabase ya dejó una sesión activa (el link trae el token en
    // la URL). updateUser cambia la contraseña de ESA sesión.
    const { error } = await supabase.auth.updateUser({ password })

    setGuardando(false)

    if (error) {
      console.log(error)
      alert('No se pudo cambiar la contraseña: ' + error.message)
      return
    }

    setMensaje('Contraseña actualizada. Ya podés ingresar con la nueva.')

    setTimeout(() => {
      navigate('/admin-login')
    }, 2000)
  }

  return (
    <div className="container">
      <h1>Elegir nueva contraseña</h1>

      {mensaje ? (
        <p>{mensaje}</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: '300px'
          }}
        >
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Repetir nueva contraseña"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
          />

          <button onClick={guardarNuevaPassword} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ResetPassword
