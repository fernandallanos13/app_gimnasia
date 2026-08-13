import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const {
    session,
    perfil,
    cargandoAuth,
    clubHabilitado
  } = useAuth()

  if (cargandoAuth) {
    return <p>Cargando...</p>
  }

  if (!session) {
    return <Navigate to="/admin-login" />
  }

  if (!perfil) {
    return (
      <div className="container">
        <h1>Tu usuario no tiene un perfil asignado</h1>
        <p>
          Pedile al administrador de la plataforma que te asigne
          un club antes de poder ingresar.
        </p>
      </div>
    )
  }

  if (!clubHabilitado) {
    return (
      <div className="container">
        <h1>Acceso deshabilitado</h1>
        <p>
          El super admin todavía no habilitó el acceso de tu club.
          Probá más tarde o consultale directamente.
        </p>
      </div>
    )
  }

  return children
}

export default ProtectedRoute