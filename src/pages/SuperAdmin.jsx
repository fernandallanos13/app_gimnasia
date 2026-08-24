import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

function SuperAdmin() {
  const navigate = useNavigate()
  const { cerrarSesion } = useAuth()

  const [clubes, setClubes] = useState([])
  const [cargando, setCargando] = useState(true)

  // --- Crear club nuevo ---
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [slugNuevo, setSlugNuevo] = useState('')
  const [colorPrimarioNuevo, setColorPrimarioNuevo] = useState('#1D9E75')
  const [colorSecundarioNuevo, setColorSecundarioNuevo] = useState('#0F6E56')
  const [logoUrlNuevo, setLogoUrlNuevo] = useState('')
  const [logoArchivoNuevo, setLogoArchivoNuevo] = useState(null)
  const [subiendoLogoNuevo, setSubiendoLogoNuevo] = useState(false)
  const [creandoClub, setCreandoClub] = useState(false)

  // --- Editar club existente ---
  const [clubEditandoId, setClubEditandoId] = useState(null)
  const [edit, setEdit] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [logoArchivoEdit, setLogoArchivoEdit] = useState(null)
  const [subiendoLogoEdit, setSubiendoLogoEdit] = useState(false)

  // --- Vincular usuario a club ---
  const [emailVincular, setEmailVincular] = useState('')
  const [clubIdVincular, setClubIdVincular] = useState('')
  const [rolVincular, setRolVincular] = useState('club_admin')
  const [nombreVincular, setNombreVincular] = useState('')
  const [vinculando, setVinculando] = useState(false)

  async function obtenerClubes() {
    setCargando(true)

    const { data, error } = await supabase
      .from('clubes')
      .select('*')
      .order('id', { ascending: false })

    setCargando(false)

    if (error) {
      console.log(error)
      return
    }

    setClubes(data)
  }

  useEffect(() => {
    obtenerClubes()
  }, [])

  function generarSlug(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  function validarLogo(archivo) {
    if (!archivo) return false

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp']

    if (!tiposPermitidos.includes(archivo.type)) {
      alert('El logo debe ser PNG, JPG/JPEG o WEBP.')
      return false
    }

    if (archivo.size > 2 * 1024 * 1024) {
      alert('El logo no puede pesar más de 2 MB.')
      return false
    }

    return true
  }

  async function subirLogo(archivo, identificador) {
    if (!archivo) return null
    if (!validarLogo(archivo)) throw new Error('Archivo de logo inválido')

    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'png'
    const nombreSeguro = String(identificador || 'club')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')

    const ruta = `${nombreSeguro}/${Date.now()}.${extension}`

    const { error: errorUpload } = await supabase.storage
      .from('logos-clubes')
      .upload(ruta, archivo, {
        cacheControl: '3600',
        upsert: true
      })

    if (errorUpload) throw errorUpload

    const { data } = supabase.storage
      .from('logos-clubes')
      .getPublicUrl(ruta)

    return data.publicUrl
  }

  async function crearClub() {
    if (!nombreNuevo.trim()) {
      alert('Poné un nombre para el club')
      return
    }

    const slugFinal = slugNuevo.trim() || generarSlug(nombreNuevo)

    setCreandoClub(true)

    try {
      let logoFinal = logoUrlNuevo.trim() || null

      if (logoArchivoNuevo) {
        setSubiendoLogoNuevo(true)
        logoFinal = await subirLogo(logoArchivoNuevo, slugFinal)
        setSubiendoLogoNuevo(false)
      }

      const { error } = await supabase.from('clubes').insert([
        {
          nombre: nombreNuevo.trim(),
          slug: slugFinal,
          color_primario: colorPrimarioNuevo,
          color_secundario: colorSecundarioNuevo,
          logo_url: logoFinal,
          activo: true
        }
      ])

      if (error) throw error
    } catch (error) {
      console.log(error)
      alert('Error al crear el club: ' + error.message)
      setCreandoClub(false)
      setSubiendoLogoNuevo(false)
      return
    }

    setCreandoClub(false)

    alert('Club creado')
    setNombreNuevo('')
    setSlugNuevo('')
    setColorPrimarioNuevo('#1D9E75')
    setColorSecundarioNuevo('#0F6E56')
    setLogoUrlNuevo('')
    setLogoArchivoNuevo(null)
    obtenerClubes()
  }

  async function toggleActivo(club) {
    const { error } = await supabase
      .from('clubes')
      .update({ activo: !club.activo })
      .eq('id', club.id)

    if (error) {
      console.log(error)
      alert('No se pudo cambiar el estado del club')
      return
    }

    obtenerClubes()
  }

  function iniciarEdicion(club) {
    setLogoArchivoEdit(null)
    setClubEditandoId(club.id)
    setEdit({
      nombre: club.nombre,
      color_primario: club.color_primario,
      color_secundario: club.color_secundario,
      logo_url: club.logo_url || ''
    })
  }

  function cancelarEdicion() {
    setClubEditandoId(null)
    setEdit({})
    setLogoArchivoEdit(null)
  }

  async function guardarEdicionClub(clubId) {
    setGuardandoEdicion(true)

    try {
      let logoFinal = edit.logo_url || null

      if (logoArchivoEdit) {
        setSubiendoLogoEdit(true)
        const clubActual = clubes.find((club) => club.id === clubId)
        logoFinal = await subirLogo(
          logoArchivoEdit,
          clubActual?.slug || clubActual?.nombre || clubId
        )
        setSubiendoLogoEdit(false)
      }

      const { error } = await supabase
        .from('clubes')
        .update({
          nombre: edit.nombre,
          color_primario: edit.color_primario,
          color_secundario: edit.color_secundario,
          logo_url: logoFinal
        })
        .eq('id', clubId)

      if (error) throw error
    } catch (error) {
      console.log(error)
      alert('No se pudo guardar: ' + error.message)
      setGuardandoEdicion(false)
      setSubiendoLogoEdit(false)
      return
    }

    setGuardandoEdicion(false)
    setClubEditandoId(null)
    setEdit({})
    setLogoArchivoEdit(null)
    obtenerClubes()
  }

  async function vincularUsuario() {
    if (!emailVincular.trim() || !clubIdVincular) {
      alert('Completá el email y elegí un club')
      return
    }

    setVinculando(true)

    const { error } = await supabase.rpc('vincular_usuario_a_club', {
      p_email: emailVincular.trim(),
      p_club_id: Number(clubIdVincular),
      p_rol: rolVincular,
      p_nombre: nombreVincular.trim() || null
    })

    setVinculando(false)

    if (error) {
      console.log(error)
      alert('No se pudo vincular: ' + error.message)
      return
    }

    alert(`Listo, ${emailVincular} quedó vinculado.`)
    setEmailVincular('')
    setClubIdVincular('')
    setNombreVincular('')
  }

  async function manejarCerrarSesion() {
    await cerrarSesion()
    navigate('/admin-login')
  }

  return (
    <div className="container">
      <h1>Super Admin</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/admin')}>
          Ir al panel normal
        </button>
        <button onClick={manejarCerrarSesion}>Cerrar sesión</button>
      </div>

      {/* ================= CREAR CLUB ================= */}
      <div className="card" style={{ maxWidth: '500px', marginBottom: '24px' }}>
        <h2>Crear club nuevo</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Nombre del club"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
          />

          <input
            type="text"
            placeholder="Slug (opcional, se genera solo)"
            value={slugNuevo}
            onChange={(e) => setSlugNuevo(e.target.value)}
          />

          <label>
            Color primario:{' '}
            <input
              type="color"
              value={colorPrimarioNuevo}
              onChange={(e) => setColorPrimarioNuevo(e.target.value)}
            />
          </label>

          <label>
            Color secundario:{' '}
            <input
              type="color"
              value={colorSecundarioNuevo}
              onChange={(e) => setColorSecundarioNuevo(e.target.value)}
            />
          </label>

          <label>
            Escudo / logo del club:
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setLogoArchivoNuevo(e.target.files?.[0] || null)}
            />
          </label>

          {logoArchivoNuevo && (
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.75 }}>
              Imagen elegida: {logoArchivoNuevo.name}
            </p>
          )}

          <input
            type="text"
            placeholder="O pegá una URL del logo (opcional)"
            value={logoUrlNuevo}
            onChange={(e) => setLogoUrlNuevo(e.target.value)}
          />

          <button onClick={crearClub} disabled={creandoClub || subiendoLogoNuevo}>
            {subiendoLogoNuevo
              ? 'Subiendo logo...'
              : creandoClub
                ? 'Creando...'
                : 'Crear club'}
          </button>
        </div>
      </div>

      {/* ================= VINCULAR USUARIO ================= */}
      <div className="card" style={{ maxWidth: '500px', marginBottom: '24px' }}>
        <h2>Vincular usuario a un club</h2>
        <p style={{ opacity: 0.75, fontSize: '14px' }}>
          El usuario tiene que existir primero en Supabase →
          Authentication → Users. Esto solo lo conecta con su club
          y le asigna el rol.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="Email del usuario (ya creado en Authentication)"
            value={emailVincular}
            onChange={(e) => setEmailVincular(e.target.value)}
          />

          <input
            type="text"
            placeholder="Nombre para mostrar (opcional)"
            value={nombreVincular}
            onChange={(e) => setNombreVincular(e.target.value)}
          />

          <select
            value={clubIdVincular}
            onChange={(e) => setClubIdVincular(e.target.value)}
          >
            <option value="">Elegí un club</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={rolVincular}
            onChange={(e) => setRolVincular(e.target.value)}
          >
            <option value="club_admin">Admin del club</option>
            <option value="super_admin">Super admin</option>
          </select>

          <button onClick={vincularUsuario} disabled={vinculando}>
            {vinculando ? 'Vinculando...' : 'Vincular'}
          </button>
        </div>
      </div>

      {/* ================= LISTA DE CLUBES ================= */}
      <div className="card" style={{ maxWidth: '700px' }}>
        <h2>Clubes</h2>

        {cargando ? (
          <p>Cargando...</p>
        ) : clubes.length === 0 ? (
          <p>No hay clubes cargados todavía.</p>
        ) : (
          clubes.map((club) => {
            const estaEditando = clubEditandoId === club.id

            return (
              <div
                key={club.id}
                style={{
                  background: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '12px',
                  marginTop: '10px'
                }}
              >
                {estaEditando ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <input
                      type="text"
                      value={edit.nombre}
                      onChange={(e) =>
                        setEdit({ ...edit, nombre: e.target.value })
                      }
                    />

                    <label>
                      Color primario:{' '}
                      <input
                        type="color"
                        value={edit.color_primario}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            color_primario: e.target.value
                          })
                        }
                      />
                    </label>

                    <label>
                      Color secundario:{' '}
                      <input
                        type="color"
                        value={edit.color_secundario}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            color_secundario: e.target.value
                          })
                        }
                      />
                    </label>

                    {edit.logo_url && (
                      <img
                        src={edit.logo_url}
                        alt="Logo actual"
                        style={{
                          width: '90px',
                          height: '90px',
                          objectFit: 'contain',
                          background: 'white',
                          borderRadius: '14px',
                          padding: '6px',
                          border: '1px solid #ddd'
                        }}
                      />
                    )}

                    <label>
                      Cambiar escudo / logo:
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setLogoArchivoEdit(e.target.files?.[0] || null)}
                      />
                    </label>

                    {logoArchivoEdit && (
                      <p style={{ margin: 0, fontSize: '13px', opacity: 0.75 }}>
                        Nueva imagen: {logoArchivoEdit.name}
                      </p>
                    )}

                    <input
                      type="text"
                      placeholder="URL del logo (también podés pegar una)"
                      value={edit.logo_url}
                      onChange={(e) =>
                        setEdit({ ...edit, logo_url: e.target.value })
                      }
                    />

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => guardarEdicionClub(club.id)}
                        disabled={guardandoEdicion || subiendoLogoEdit}
                      >
                        {subiendoLogoEdit
                          ? 'Subiendo logo...'
                          : guardandoEdicion
                            ? 'Guardando...'
                            : 'Guardar'}
                      </button>
                      <button
                        className="danger"
                        onClick={cancelarEdicion}
                        disabled={guardandoEdicion}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {club.logo_url && (
                      <img
                        src={club.logo_url}
                        alt={club.nombre}
                        style={{
                          width: '72px',
                          height: '72px',
                          objectFit: 'contain',
                          background: 'white',
                          borderRadius: '14px',
                          padding: '6px',
                          border: '1px solid #ddd',
                          marginBottom: '8px'
                        }}
                      />
                    )}

                    <h3>
                      {club.nombre}{' '}
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 'normal',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: club.activo ? '#d1f5dc' : '#f5d1d1',
                          color: club.activo ? '#0a6b32' : '#a11414'
                        }}
                      >
                        {club.activo ? 'Activo' : 'Desactivado'}
                      </span>
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <span
                        title="Color primario"
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: club.color_primario,
                          display: 'inline-block'
                        }}
                      />
                      <span
                        title="Color secundario"
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: club.color_secundario,
                          display: 'inline-block'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => toggleActivo(club)}>
                        {club.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => iniciarEdicion(club)}>
                        Editar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default SuperAdmin
