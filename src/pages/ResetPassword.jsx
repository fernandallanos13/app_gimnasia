import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

const TIMEOUT_MS = 12000

function conTimeout(promesa, mensaje) {
  return Promise.race([
    promesa,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(mensaje)), TIMEOUT_MS)
    )
  ])
}

function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorPantalla, setErrorPantalla] = useState('')
  const [sesionValida, setSesionValida] = useState(null)

  useEffect(() => {
    let montado = true

    async function chequearSesion() {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.replace('#', '')
        )
        const errorEnUrl = hashParams.get('error')
        const descripcionError = hashParams.get('error_description')

        if (errorEnUrl) {
          console.log('Error en el link:', errorEnUrl, descripcionError)

          if (montado) {
            setErrorPantalla(
              'Este link de recuperación venció o ya fue utilizado. Solicitá uno nuevo e intentá nuevamente.'
            )
            setSesionValida(false)
          }
          return
        }

        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        // En el flujo PKCE Supabase envía ?code=...
        // exchangeCodeForSession debe recibir ese código, no la URL completa.
        if (code) {
          const { error: errorCanje } = await conTimeout(
            supabase.auth.exchangeCodeForSession(code),
            'Supabase tardó demasiado en validar el enlace de recuperación.'
          )

          if (errorCanje) {
            console.log('Error al canjear code por sesión:', errorCanje)

            if (montado) {
              setErrorPantalla(
                'No se pudo validar el enlace de recuperación. Puede haber vencido o ya haber sido utilizado.'
              )
              setSesionValida(false)
            }
            return
          }
        }

        const {
          data: { session },
          error
        } = await conTimeout(
          supabase.auth.getSession(),
          'Supabase tardó demasiado en verificar la sesión.'
        )

        if (error) {
          console.log('Error al verificar sesión:', error)

          if (montado) {
            setErrorPantalla(
              'No se pudo verificar el enlace de recuperación. Solicitá uno nuevo e intentá nuevamente.'
            )
            setSesionValida(false)
          }
          return
        }

        if (montado) {
          setSesionValida(!!session)

          if (!session) {
            setErrorPantalla(
              'Este link de recuperación no generó una sesión válida. Puede haber vencido o ya haber sido utilizado.'
            )
          }
        }
      } catch (err) {
        console.log('Error inesperado verificando el link:', err)

        if (montado) {
          setErrorPantalla(
            err?.message || 'No se pudo verificar el enlace de recuperación.'
          )
          setSesionValida(false)
        }
      }
    }

    chequearSesion()

    return () => {
      montado = false
    }
  }, [])

  async function guardarNuevaPassword() {
    setErrorPantalla('')
    setMensaje('')

    if (!password || password.length < 6) {
      setErrorPantalla('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmarPassword) {
      setErrorPantalla('Las dos contraseñas no coinciden.')
      return
    }

    if (guardando) return

    setGuardando(true)

    try {
      const {
        data: { session },
        error: errorSesion
      } = await conTimeout(
        supabase.auth.getSession(),
        'Supabase tardó demasiado en verificar la sesión.'
      )

      if (errorSesion) {
        throw errorSesion
      }

      if (!session) {
        setSesionValida(false)
        setErrorPantalla(
          'El link de recuperación ya no tiene una sesión válida. Solicitá uno nuevo e intentá nuevamente.'
        )
        return
      }

      const { error } = await conTimeout(
        supabase.auth.updateUser({ password }),
        'La actualización de la contraseña tardó demasiado. Volvé a intentarlo.'
      )

      if (error) {
        console.log('Error al actualizar contraseña:', error)
        setErrorPantalla('No se pudo cambiar la contraseña: ' + error.message)
        return
      }

      setMensaje('Contraseña actualizada correctamente. Ya podés ingresar con la nueva.')
      setPassword('')
      setConfirmarPassword('')

      // Cerramos la sesión temporal creada por el enlace de recuperación
      // para que el próximo acceso sea con la contraseña nueva.
      try {
        await conTimeout(
          supabase.auth.signOut(),
          'La sesión tardó demasiado en cerrarse.'
        )
      } catch (errorCierre) {
        console.log('La contraseña se guardó, pero no se pudo cerrar la sesión:', errorCierre)
      }

      setTimeout(() => {
        navigate('/admin-login', { replace: true })
      }, 1800)
    } catch (err) {
      console.log('Error inesperado al cambiar contraseña:', err)
      setErrorPantalla(
        err?.message || 'Ocurrió un error inesperado al cambiar la contraseña.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="container">
      <h1>Elegir nueva contraseña</h1>

      {mensaje && <p>{mensaje}</p>}

      {errorPantalla && (
        <p style={{ color: '#b00020' }}>
          {errorPantalla}
        </p>
      )}

      {!mensaje && sesionValida === null ? (
        <p>Verificando el link...</p>
      ) : !mensaje && sesionValida === false ? (
        <div>
          <p>
            Pedí un nuevo mail de recuperación y abrí el enlace más reciente.
          </p>
          <button onClick={() => navigate('/admin-login')}>
            Volver al login
          </button>
        </div>
      ) : !mensaje ? (
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
            disabled={guardando}
            autoComplete="new-password"
          />

          <input
            type="password"
            placeholder="Repetir nueva contraseña"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            disabled={guardando}
            autoComplete="new-password"
          />

          <button onClick={guardarNuevaPassword} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default ResetPassword
