import { useEffect, useState } from 'react'

import { Navigate } from 'react-router-dom'

import { supabase } from '../services/supabase'

function ProtectedRoute({ children }) {

  const [loading, setLoading] = useState(true)

  const [session, setSession] = useState(null)

  useEffect(() => {

    async function verificarSesion() {

      const {
        data: { session }
      } = await supabase.auth.getSession()

      setSession(session)

      setLoading(false)
    }

    verificarSesion()

  }, [])

  if (loading) {
    return <p>Cargando...</p>
  }

  if (!session) {
    return <Navigate to="/admin-login" />
  }

  return children
}

export default ProtectedRoute