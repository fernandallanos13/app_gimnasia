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
      return null
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
      return null
    }

    setPerfil(data)
    return data
  }

  useEffect(() => {
    let montado = true

    async function inicializar() {
      try {
        const {
          data: { session: sesionActual },
          error
        } = await supabase.auth.getSession()

        if (!montado) return

        if (error) {
          console.log('Error al obtener sesión:', error)
          setSession(null)
          setPerfil(null)
          return
        }

        setSession(sesionActual)

        if (sesionActual?.user?.id) {
          await cargarPerfil(sesionActual.user.id)
        } else {
          setPerfil(null)
        }
      } catch (error) {
        console.log('Error al inicializar autenticación:', error)
        if (montado) {
          setSession(null)
          setPerfil(null)
        }
      } finally {
        if (montado) {
          setCargandoAuth(false)
        }
      }
    }

    inicializar()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_evento, sesionNueva) => {
        if (!montado) return

        setSession(sesionNueva)

        if (!sesionNueva?.user?.id) {
          setPerfil(null)
          setCargandoAuth(false)
          return
        }

        // IMPORTANTE:
        // No hacemos await de consultas a Supabase dentro de
        // onAuthStateChange. Algunas operaciones de Auth (por ejemplo
        // updateUser al cambiar la contraseña) pueden quedar esperando
        // si desde este callback se inicia otra consulta y se la espera.
        // La carga del perfil se difiere al siguiente ciclo.
        setTimeout(async () => {
          if (!montado) return

          try {
            await cargarPerfil(sesionNueva.user.id)
          } catch (error) {
            console.log('Error al recargar perfil:', error)
            if (montado) setPerfil(null)
          } finally {
            if (montado) setCargandoAuth(false)
          }
        }, 0)
      }
    )

    return () => {
      montado = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.log('Error al cerrar sesión:', error)
      return
    }

    setSession(null)
    setPerfil(null)
  }

  const esSuperAdmin = perfil?.rol === 'super_admin'
  const esClubAdmin = perfil?.rol === 'club_admin'
  const clubId = perfil?.club_id || null
  const club = perfil?.clubes || null

  useEffect(() => {
    if (esClubAdmin && club) {
      aplicarTemaClub(club)
    } else {
      resetearTema()
    }
  }, [esClubAdmin, club])

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
