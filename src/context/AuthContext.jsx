import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { aplicarTemaClub, resetearTema } from '../utils/tema'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargandoAuth, setCargandoAuth] = useState(true)

  async function cargarPerfil(userId) {
    if (!userId) {
      setPerfil(null)
      return
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select(`
        id,
        rol,
        club_id,
        nombre,
        clubes (
          id,
          nombre,
          slug,
          color_primario,
          color_secundario,
          logo_url,
          activo
        )
      `)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.log('Error al cargar perfil:', error)
      setPerfil(null)
      return
    }

    setPerfil(data)
  }

  useEffect(() => {
    async function inicializar() {
      const {
        data: { session: sesionActual }
      } = await supabase.auth.getSession()

      setSession(sesionActual)

      if (sesionActual?.user?.id) {
        await cargarPerfil(sesionActual.user.id)
      }

      setCargandoAuth(false)
    }

    inicializar()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_evento, sesionNueva) => {
        setSession(sesionNueva)

        if (sesionNueva?.user?.id) {
          await cargarPerfil(sesionNueva.user.id)
        } else {
          setPerfil(null)
        }
      }
    )

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSession(null)
    setPerfil(null)
  }

  const esSuperAdmin = perfil?.rol === 'super_admin'
  const esClubAdmin = perfil?.rol === 'club_admin'
  const clubId = perfil?.club_id || null
  const club = perfil?.clubes || null

  // Apenas sabemos de qué club es la cuenta logueada, pintamos
  // la app con sus colores. Super admin (o nadie logueado) usa
  // los colores por defecto.
  useEffect(() => {
    if (esClubAdmin && club) {
      aplicarTemaClub(club)
    } else {
      resetearTema()
    }
  }, [esClubAdmin, club])

  // Un club puede estar desactivado por el super admin (fuera de
  // su ventana de torneo). Si es así, el club_admin no debería
  // poder operar aunque su login sea válido.
  const clubHabilitado = esSuperAdmin || (esClubAdmin && club?.activo === true)

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        cargandoAuth,
        esSuperAdmin,
        esClubAdmin,
        clubId,
        club,
        clubHabilitado,
        cerrarSesion,
        recargarPerfil: () => cargarPerfil(session?.user?.id)
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)

  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }

  return contexto
}
