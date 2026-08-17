import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SuperAdminRoute({ children }) {
  const { session, perfil, cargandoAuth, esSuperAdmin } = useAuth()

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
      </div>
    )
  }

  if (!esSuperAdmin) {
    return (
      <div className="container">
        <h1>Esta sección es solo para super admin</h1>
        <p>Tu cuenta no tiene ese permiso.</p>
      </div>
    )
  }

  return children
}

export default SuperAdminRoute
