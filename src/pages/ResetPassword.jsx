import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [sesionValida, setSesionValida] = useState(null)

  useEffect(() => {
    async function chequearSesion() {
      try {
        // Si el link ya venció o ya se usó, Supabase lo marca con
        // un "error" directo en el hash de la URL (ej:
        // #error=access_denied&error_code=otp_expired). Lo
        // detectamos de una para no esperar a que falle después.
        const hashParams = new URLSearchParams(
          window.location.hash.replace('#', '')
        )
        const errorEnUrl = hashParams.get('error')
        const descripcionError = hashParams.get('error_description')

        if (errorEnUrl) {
          console.log('Error en el link:', errorEnUrl, descripcionError)
          setSesionValida(false)
          return
        }

        // Si el link usa el flujo PKCE (trae ?code=... en la URL),
        // hay que canjearlo por una sesión a mano.
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error: errorCanje } =
            await supabase.auth.exchangeCodeForSession(window.location.href)

          if (errorCanje) {
            console.log('Error al canjear code por sesión:', errorCanje)
          }
        }

        // Le damos un instante al cliente para terminar de procesar
        // el link antes de chequear si quedó sesión activa.
        await new Promise((resolve) => setTimeout(resolve, 800))

        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error) {
          console.log('Error al verificar sesión:', error)
        }

        setSesionValida(!!session)
      } catch (err) {
        console.log('Error inesperado verificando el link:', err)
        setSesionValida(false)
      }
    }

    chequearSesion()
  }, [])

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

    try {
      // Chequeo defensivo: si por algún motivo no hay sesión activa
      // en este momento (el link no generó una sesión válida),
      // avisamos en vez de quedarnos esperando para siempre.
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        alert(
          'El link de recuperación no generó una sesión válida. ' +
          'Puede haber vencido (duran poco tiempo) o ya haber sido ' +
          'usado. Pedí que te manden uno nuevo y abrilo apenas llegue.'
        )
        return
      }

      // Cuando se llega acá desde el link del mail de recuperación,
      // Supabase ya dejó una sesión activa. updateUser cambia la
      // contraseña de ESA sesión.
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.log('Error al actualizar contraseña:', error)
        alert('No se pudo cambiar la contraseña: ' + error.message)
        return
      }

      setMensaje('Contraseña actualizada. Ya podés ingresar con la nueva.')

      setTimeout(() => {
        navigate('/admin-login')
      }, 2000)
    } catch (err) {
      console.log('Error inesperado:', err)
      alert('Ocurrió un error inesperado: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="container">
      <h1>Elegir nueva contraseña</h1>

      {mensaje ? (
        <p>{mensaje}</p>
      ) : sesionValida === false ? (
        <p>
          Este link ya venció o ya fue usado. Pedí que te manden un
          mail de recuperación nuevo y abrilo apenas te llegue —
          duran poco tiempo.
        </p>
      ) : sesionValida === null ? (
        <p>Verificando el link...</p>
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
