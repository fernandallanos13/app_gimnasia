import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { QRCodeCanvas } from 'qrcode.react'

import { supabase } from '../services/supabase'

function Admin() {
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [torneos, setTorneos] = useState([])
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null)

  const [niveles, setNiveles] = useState([])
  const [categorias, setCategorias] = useState([])

  const [nombreGimnasta, setNombreGimnasta] = useState('')
  const [apellidoGimnasta, setApellidoGimnasta] = useState('')
  const [club, setClub] = useState('')
  const [profe, setProfe] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')

  const [gimnastasInscriptas, setGimnastasInscriptas] = useState([])

  const [gimnastaEditandoId, setGimnastaEditandoId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editApellido, setEditApellido] = useState('')
  const [editClub, setEditClub] = useState('')
  const [editProfe, setEditProfe] = useState('')
  const [editNivelId, setEditNivelId] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')

  const [puntajesCargados, setPuntajesCargados] = useState([])
  const [puntajeEditandoId, setPuntajeEditandoId] = useState(null)
  const [editPuntaje, setEditPuntaje] = useState('')

  const [vistaAdmin, setVistaAdmin] = useState('gimnastas')
  const [mostrarHistoricos, setMostrarHistoricos] = useState(false)
  const [ordenGimnastas, setOrdenGimnastas] = useState('apellido')
  const [archivoExcel, setArchivoExcel] = useState(null)
const [importandoExcel, setImportandoExcel] = useState(false)

  async function obtenerTorneos() {
    const { data, error } = await supabase
      .from('torneos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.log(error)
    } else {
      setTorneos(data)
    }
  }

  async function obtenerNivelesYCategorias() {
    const { data: nivelesData, error: nivelesError } = await supabase
      .from('niveles')
      .select('*')

    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias')
      .select('*')

    if (nivelesError || categoriasError) {
      console.log(nivelesError || categoriasError)
    } else {
      setNiveles(nivelesData)
      setCategorias(categoriasData)
    }
  }

  async function crearTorneo() {
    if (!nombre || !codigo) {
      alert('Completá todos los campos')
      return
    }

    const { error } = await supabase
      .from('torneos')
      .insert([{ nombre, codigo, estado: 'activo' }])

    if (error) {
      console.log(error)
      alert('Error al crear torneo')
    } else {
      alert('Torneo creado')
      setNombre('')
      setCodigo('')
      obtenerTorneos()
    }
  }

  async function obtenerGimnastasInscriptas(torneoId) {
    const { data, error } = await supabase
      .from('inscripciones')
      .select(`
        id,
        gimnastas (
          id,
          nombre,
          apellido,
          club,
          profe,
          nivel_id,
          categoria_id,
          niveles (nombre),
          categorias (nombre)
        )
      `)
      .eq('torneo_id', torneoId)

    if (error) {
      console.log(error)
      alert('Error al traer gimnastas inscriptas')
    } else {
      setGimnastasInscriptas(data)
    }
  }

  async function cargarGimnasta() {
    if (!torneoSeleccionado) {
      alert('Primero seleccioná un torneo')
      return
    }

    if (!nombreGimnasta || !apellidoGimnasta || !nivelId || !categoriaId) {
      alert('Completá nombre, apellido, nivel y categoría')
      return
    }

    const { data: gimnastaCreada, error: errorGimnasta } = await supabase
      .from('gimnastas')
      .insert([
        {
          nombre: nombreGimnasta,
          apellido: apellidoGimnasta,
          club,
          profe,
          nivel_id: Number(nivelId),
          categoria_id: Number(categoriaId)
        }
      ])
      .select()
      .single()

    if (errorGimnasta) {
      console.log(errorGimnasta)
      alert('Error al cargar gimnasta')
      return
    }

    const { error: errorInscripcion } = await supabase
      .from('inscripciones')
      .insert([
        {
          torneo_id: torneoSeleccionado.id,
          gimnasta_id: gimnastaCreada.id
        }
      ])

    if (errorInscripcion) {
      console.log(errorInscripcion)
      alert('La gimnasta se creó, pero hubo error al inscribirla')
      return
    }

    alert('Gimnasta cargada e inscripta')

    setNombreGimnasta('')
    setApellidoGimnasta('')
    setClub('')
    setProfe('')
    setNivelId('')
    setCategoriaId('')

    obtenerGimnastasInscriptas(torneoSeleccionado.id)
  }

  async function importarExcel() {
    if (!torneoSeleccionado) {
      alert('Primero seleccioná un torneo')
      return
    }

    if (!archivoExcel) {
  alert('Primero seleccioná un archivo Excel')
  return
}

const archivo = archivoExcel
setImportandoExcel(true)

    const normalizar = (texto) =>
      String(texto || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const lector = new FileReader()

    lector.onload = async (evento) => {
      const datos = new Uint8Array(evento.target.result)
      const workbook = XLSX.read(datos, { type: 'array' })
      const hoja = workbook.Sheets[workbook.SheetNames[0]]

     const todasLasFilas = XLSX.utils.sheet_to_json(hoja, {
  header: 1,
  defval: ''
})

const filaEncabezadosIndex = todasLasFilas.findIndex((fila) => {
  const textos = fila.map((celda) =>
    String(celda || '').toLowerCase().trim()
  )

  return (
    textos.includes('nombre') &&
    textos.includes('apellido') &&
    textos.includes('nivel')
  )
})

if (filaEncabezadosIndex === -1) {
  alert('No se encontraron encabezados válidos. Revisá que el Excel tenga columnas: Nombre, Apellido, Nivel y Categoría.')
  return
}

const filas = XLSX.utils.sheet_to_json(hoja, {
  defval: '',
  range: filaEncabezadosIndex
})

      let cargadas = 0
      let omitidas = 0
      let errores = 0

      for (const fila of filas) {
        const nombre = fila.nombre || fila.Nombre || fila.NOMBRE || ''
        const apellido = fila.apellido || fila.Apellido || fila.APELLIDO || ''
        const club = fila.club || fila.Club || fila.CLUB || ''
        const profe =
          fila.profe ||
          fila.Profe ||
          fila.PROFE ||
          fila.profesor ||
          fila.Profesor ||
          fila.PROFESOR ||
          fila.entrenador ||
          fila.Entrenador ||
          fila.ENTRENADOR ||
          ''

        const nivelExcel = fila.nivel || fila.Nivel || fila.NIVEL || ''

        const categoriaExcel =
          fila.categoria ||
          fila.Categoria ||
          fila.CATEGORIA ||
          fila.categoría ||
          fila.Categoría ||
          fila.CATEGORÍA ||
          ''

        const nivelEncontrado = niveles.find(
          (nivel) => normalizar(nivel.nombre) === normalizar(nivelExcel)
        )

        const categoriaEncontrada = categorias.find(
          (categoria) =>
            normalizar(categoria.nombre) === normalizar(categoriaExcel)
        )

        if (!nombre || !apellido || !nivelEncontrado || !categoriaEncontrada) {
          errores++
          console.log('Fila con error:', fila)
          continue
        }

        const { data: inscripcionesExistentes, error: errorBusqueda } =
          await supabase
            .from('inscripciones')
            .select(`
              id,
              gimnastas (
                id,
                nombre,
                apellido,
                club,
                nivel_id,
                categoria_id
              )
            `)
            .eq('torneo_id', torneoSeleccionado.id)

        if (errorBusqueda) {
          console.log(errorBusqueda)
          errores++
          continue
        }

        const yaExiste = inscripcionesExistentes.some((inscripcion) => {
          const g = inscripcion.gimnastas

          return (
            normalizar(g?.nombre) === normalizar(nombre) &&
            normalizar(g?.apellido) === normalizar(apellido) &&
            normalizar(g?.club) === normalizar(club) &&
            g?.nivel_id === nivelEncontrado.id &&
            g?.categoria_id === categoriaEncontrada.id
          )
        })

        if (yaExiste) {
          omitidas++
          continue
        }

        const { data: gimnastaCreada, error: errorGimnasta } = await supabase
          .from('gimnastas')
          .insert([
            {
              nombre,
              apellido,
              club,
              profe,
              nivel_id: nivelEncontrado.id,
              categoria_id: categoriaEncontrada.id
            }
          ])
          .select()
          .single()

        if (errorGimnasta) {
          console.log(errorGimnasta)
          errores++
          continue
        }

        const { error: errorInscripcion } = await supabase
          .from('inscripciones')
          .insert([
            {
              torneo_id: torneoSeleccionado.id,
              gimnasta_id: gimnastaCreada.id
            }
          ])

        if (errorInscripcion) {
          console.log(errorInscripcion)
          errores++
          continue
        }

        cargadas++
      }

      alert(
        `Importación finalizada. Cargadas: ${cargadas}. Omitidas por duplicado: ${omitidas}. Errores: ${errores}.`
      )

      obtenerGimnastasInscriptas(torneoSeleccionado.id)
      setArchivoExcel(null)
setImportandoExcel(false)
    }

    lector.readAsArrayBuffer(archivo)
  }

  async function toggleResultadosPublicos(torneoId, estadoActual) {
    const { error } = await supabase
      .from('torneos')
      .update({
        resultados_publicos: !estadoActual
      })
      .eq('id', torneoId)

    if (error) {
      console.log(error)
      alert('Error al actualizar publicación')
      return
    }

    obtenerTorneos()
  }

  function copiarLinkPublico() {
    const link = `${window.location.origin}/resultados`
    navigator.clipboard.writeText(link)
    alert('Link público copiado')
  }

  function iniciarEdicion(inscripcion) {
    const g = inscripcion.gimnastas

    setGimnastaEditandoId(g.id)
    setEditNombre(g.nombre || '')
    setEditApellido(g.apellido || '')
    setEditClub(g.club || '')
    setEditProfe(g.profe || '')
    setEditNivelId(g.nivel_id || '')
    setEditCategoriaId(g.categoria_id || '')
  }

  function cancelarEdicion() {
    setGimnastaEditandoId(null)
  }

  async function guardarEdicionGimnasta(gimnastaId) {
    const { error } = await supabase
      .from('gimnastas')
      .update({
        nombre: editNombre,
        apellido: editApellido,
        club: editClub,
        profe: editProfe,
        nivel_id: Number(editNivelId),
        categoria_id: Number(editCategoriaId)
      })
      .eq('id', gimnastaId)

    if (error) {
      console.log(error)
      alert('Error al editar gimnasta')
      return
    }

    alert('Gimnasta editada')
    setGimnastaEditandoId(null)
    obtenerGimnastasInscriptas(torneoSeleccionado.id)
  }

  async function obtenerPuntajesCargados(torneoId) {
    const { data, error } = await supabase
      .from('puntajes')
      .select(`
        id,
        puntaje,
        gimnastas (
          nombre,
          apellido,
          club
        ),
        aparatos (
          nombre
        ),
        jueces (
          nombre
        )
      `)
      .eq('torneo_id', torneoId)

    if (error) {
      console.log(error)
      alert('Error al traer puntajes')
    } else {
      setPuntajesCargados(data)
    }
  }

  function iniciarEdicionPuntaje(puntaje) {
    setPuntajeEditandoId(puntaje.id)
    setEditPuntaje(puntaje.puntaje)
  }

  function cancelarEdicionPuntaje() {
    setPuntajeEditandoId(null)
    setEditPuntaje('')
  }

  async function guardarEdicionPuntaje(puntajeId) {
    if (
      editPuntaje === '' ||
      Number(editPuntaje) < 0 ||
      Number(editPuntaje) > 99
    ) {
      alert('El puntaje debe estar entre 0 y 99')
      return
    }

    const { error } = await supabase
      .from('puntajes')
      .update({
        puntaje: Number(editPuntaje)
      })
      .eq('id', puntajeId)

    if (error) {
      console.log(error)
      alert('Error al editar puntaje')
      return
    }

    alert('Puntaje editado')
    setPuntajeEditandoId(null)
    setEditPuntaje('')
    obtenerPuntajesCargados(torneoSeleccionado.id)
  }

  async function exportarResultadosExcelPorTorneo(torneo) {
    const { data, error } = await supabase
      .from('puntajes')
      .select(`
        puntaje,
        gimnastas (
          nombre,
          apellido,
          club,
          niveles (nombre),
          categorias (nombre)
        ),
        aparatos (nombre)
      `)
      .eq('torneo_id', torneo.id)

    if (error) {
      console.log(error)
      alert('Error al exportar resultados')
      return
    }

    const agrupados = {}

    data.forEach((item) => {
      const g = item.gimnastas
      const aparato = item.aparatos?.nombre

      if (!g || !aparato) return

      const clave = `${g.apellido}-${g.nombre}-${g.club}`

      if (!agrupados[clave]) {
        agrupados[clave] = {
          Apellido: g.apellido,
          Nombre: g.nombre,
          Club: g.club,
          Nivel: g.niveles?.nombre || '',
          Categoria: g.categorias?.nombre || '',
          Suelo: 0,
          Salto: 0,
          Viga: 0,
          Paralelas: 0,
          Total: 0
        }
      }

      agrupados[clave][aparato] = Number(item.puntaje)
      agrupados[clave].Total += Number(item.puntaje)
    })

    const hoja = XLSX.utils.json_to_sheet(Object.values(agrupados))
    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(libro, hoja, 'Resultados')
    XLSX.writeFile(libro, `resultados-${torneo.nombre}.xlsx`)
  }

  async function exportarResultadosExcel() {
    if (!torneoSeleccionado) {
      alert('Primero seleccioná un torneo')
      return
    }

    exportarResultadosExcelPorTorneo(torneoSeleccionado)
  }

  async function cerrarTorneo(torneoId) {
    const confirmar = confirm('¿Seguro que querés cerrar este torneo?')

    if (!confirmar) return

    const { error } = await supabase
      .from('torneos')
      .update({
        estado: 'cerrado'
      })
      .eq('id', torneoId)

    if (error) {
      console.log(error)
      alert('Error al cerrar torneo')
      return
    }

    alert('Torneo cerrado')

    setTorneoSeleccionado(null)
    setGimnastasInscriptas([])
    setPuntajesCargados([])

    obtenerTorneos()
  }

  function descargarQR(torneoNombre) {
    const canvas = document.querySelector('.qr-box canvas')

    if (!canvas) {
      alert('No se encontró el QR')
      return
    }

    const qrImage = canvas.toDataURL('image/png')

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = 800
    finalCanvas.height = 1000

    const ctx = finalCanvas.getContext('2d')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

    ctx.fillStyle = '#c1121f'
    ctx.font = 'bold 44px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('ESCANEÁ PARA VER', 400, 120)
    ctx.fillText('LOS RESULTADOS EN VIVO', 400, 180)

    const img = new Image()

    img.onload = () => {
      ctx.drawImage(img, 200, 260, 400, 400)

      ctx.fillStyle = '#333'
      ctx.font = 'bold 30px Arial'
      ctx.fillText(torneoNombre, 400, 760)

      const link = document.createElement('a')
      link.download = `qr-resultados-${torneoNombre}.png`
      link.href = finalCanvas.toDataURL('image/png')
      link.click()
    }

    img.src = qrImage
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/admin-login')
  }

  useEffect(() => {
    obtenerTorneos()
    obtenerNivelesYCategorias()
  }, [])

  const gimnastasOrdenadas = [...gimnastasInscriptas].sort((a, b) => {
    const ga = a.gimnastas
    const gb = b.gimnastas

    if (ordenGimnastas === 'nivel-apellido') {
      const nivelA = ga?.niveles?.nombre || ''
      const nivelB = gb?.niveles?.nombre || ''

      if (nivelA !== nivelB) {
        return nivelA.localeCompare(nivelB)
      }
    }

    const apellidoA = ga?.apellido || ''
    const apellidoB = gb?.apellido || ''

    return apellidoA.localeCompare(apellidoB)
  })

  const torneosActivos = torneos.filter(
    (torneo) => torneo.estado !== 'cerrado'
  )

  const torneosHistoricos = torneos.filter(
    (torneo) => torneo.estado === 'cerrado'
  )

  return (
    <div className="container">
      <h1>Panel Admin</h1>

      <button onClick={cerrarSesion}>
        Cerrar sesión
      </button>

      <button onClick={() => setMostrarHistoricos(!mostrarHistoricos)}>
        {mostrarHistoricos ? 'Ocultar torneos históricos' : 'Ver torneos históricos'}
      </button>

      {mostrarHistoricos && (
        <div className="card" style={{ maxWidth: '700px' }}>
          <h2>Torneos históricos</h2>

          {torneosHistoricos.length === 0 ? (
            <p>No hay torneos cerrados todavía.</p>
          ) : (
            torneosHistoricos.map((torneo) => (
              <div
                key={torneo.id}
                style={{
                  background: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '12px',
                  marginTop: '10px'
                }}
              >
                <h3>{torneo.nombre}</h3>

                <button onClick={() => exportarResultadosExcelPorTorneo(torneo)}>
                  Descargar Excel
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '300px',
          marginTop: '30px'
        }}
      >
        <h2>Crear torneo</h2>

        <input
          type="text"
          placeholder="Nombre torneo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <input
          type="text"
          placeholder="Código torneo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />

        <button onClick={crearTorneo}>
          Crear torneo
        </button>
      </div>

      <div style={{ marginTop: '40px', width: '90%', maxWidth: '700px' }}>
        <h2>Torneos activos</h2>

        {torneosActivos.length === 0 ? (
          <p>No hay torneos activos.</p>
        ) : (
          torneosActivos.map((torneo) => (
            <div
              key={torneo.id}
              onClick={() => {
                setTorneoSeleccionado(torneo)
                obtenerGimnastasInscriptas(torneo.id)
                obtenerPuntajesCargados(torneo.id)
              }}
              style={{
                background:
                  torneoSeleccionado?.id === torneo.id ? '#d4edda' : 'white',
                padding: '20px',
                borderRadius: '14px',
                marginTop: '15px',
                cursor: 'pointer',
                border:
                  torneoSeleccionado?.id === torneo.id
                    ? '3px solid green'
                    : '1px solid #ccc'
              }}
            >
              <h3>{torneo.nombre}</h3>

              <p>Estado: {torneo.estado}</p>

              <p>
                Resultados públicos:{' '}
                {torneo.resultados_publicos ? 'Sí' : 'No'}
              </p>

              <div className="actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleResultadosPublicos(
                      torneo.id,
                      torneo.resultados_publicos
                    )
                  }}
                >
                  {torneo.resultados_publicos
                    ? 'Ocultar resultados'
                    : 'Publicar resultados'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copiarLinkPublico()
                  }}
                >
                  Copiar link público
                </button>

                <div className="qr-box">
                  <p>Escaneá para ver resultados</p>

                  <QRCodeCanvas
                    value={`${window.location.origin}/resultados`}
                    size={140}
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      descargarQR(torneo.nombre)
                    }}
                  >
                    Descargar QR
                  </button>
                </div>

               {torneo.estado !== 'cerrado' && (
  <button
    className="danger"
    onClick={(e) => {
      e.stopPropagation()
      cerrarTorneo(torneo.id)
    }}
    style={{
      background: '#b00020',
      color: 'white',
      width: '220px',
      padding: '14px 20px',
      alignSelf: 'flex-start'
    }}
  >
    Cerrar torneo
  </button>
)}
              </div>
            </div>
          ))
        )}
      </div>

      {torneoSeleccionado && (
        <div
          style={{
            marginTop: '40px',
            background: '#fff',
            padding: '20px',
            borderRadius: '14px',
            width: '90%',
            maxWidth: '1000px'
          }}
        >
          <h2>Torneo seleccionado</h2>
          <p>{torneoSeleccionado.nombre}</p>
          <p>Código: {torneoSeleccionado.codigo}</p>

          <button onClick={exportarResultadosExcel}>
            Exportar resultados a Excel
          </button>

          <hr style={{ margin: '25px 0' }} />

          <h2>Importar desde Excel</h2>

          <input
  type="file"
  accept=".xlsx, .xls"
  onChange={(e) => setArchivoExcel(e.target.files[0])}
/>

{archivoExcel && (
  <p style={{ marginTop: '10px' }}>
    Archivo seleccionado: {archivoExcel.name}
  </p>
)}

<button
  onClick={importarExcel}
  disabled={importandoExcel}
  style={{ marginTop: '10px' }}
>
  {importandoExcel ? 'Importando...' : 'Cargar Excel'}
</button>

          <hr style={{ margin: '25px 0' }} />

          <h2>Cargar gimnasta</h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <input
              type="text"
              placeholder="Nombre"
              value={nombreGimnasta}
              onChange={(e) => setNombreGimnasta(e.target.value)}
            />

            <input
              type="text"
              placeholder="Apellido"
              value={apellidoGimnasta}
              onChange={(e) => setApellidoGimnasta(e.target.value)}
            />

            <input
              type="text"
              placeholder="Club"
              value={club}
              onChange={(e) => setClub(e.target.value)}
            />

            <input
              type="text"
              placeholder="Profe"
              value={profe}
              onChange={(e) => setProfe(e.target.value)}
            />

            <select value={nivelId} onChange={(e) => setNivelId(e.target.value)}>
              <option value="">Seleccionar nivel</option>
              {niveles.map((nivel) => (
                <option key={nivel.id} value={nivel.id}>
                  {nivel.nombre}
                </option>
              ))}
            </select>

            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>

            <button onClick={cargarGimnasta}>
              Cargar gimnasta
            </button>
          </div>

          <hr style={{ margin: '25px 0' }} />

          <div className="mobile-tabs">
            <button onClick={() => setVistaAdmin('gimnastas')}>
              Ver/editar gimnastas
            </button>

            <button onClick={() => setVistaAdmin('puntajes')}>
              Ver/editar puntajes
            </button>
          </div>

          <div className="admin-grid">
            <div
              className={
                vistaAdmin === 'gimnastas'
                  ? 'admin-section active'
                  : 'admin-section'
              }
            >
              <h2>Gimnastas inscriptas</h2>

              <select
                value={ordenGimnastas}
                onChange={(e) => setOrdenGimnastas(e.target.value)}
                style={{
                  marginTop: '10px',
                  marginBottom: '15px'
                }}
              >
                <option value="apellido">
                  Ordenar por apellido
                </option>

                <option value="nivel-apellido">
                  Ordenar por nivel + apellido
                </option>
              </select>

              {gimnastasInscriptas.length === 0 ? (
                <p>No hay gimnastas inscriptas en este torneo.</p>
              ) : (
                gimnastasOrdenadas.map((inscripcion) => (
                  <div
                    key={inscripcion.id}
                    style={{
                      background: '#f5f5f5',
                      padding: '15px',
                      borderRadius: '12px',
                      marginTop: '10px'
                    }}
                  >
                    {gimnastaEditandoId === inscripcion.gimnastas.id ? (
                      <>
                        <input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                        />

                        <input
                          value={editApellido}
                          onChange={(e) => setEditApellido(e.target.value)}
                        />

                        <input
                          value={editClub}
                          onChange={(e) => setEditClub(e.target.value)}
                        />

                        <input
                          value={editProfe}
                          onChange={(e) => setEditProfe(e.target.value)}
                        />

                        <select
                          value={editNivelId}
                          onChange={(e) => setEditNivelId(e.target.value)}
                        >
                          {niveles.map((nivel) => (
                            <option key={nivel.id} value={nivel.id}>
                              {nivel.nombre}
                            </option>
                          ))}
                        </select>

                        <select
                          value={editCategoriaId}
                          onChange={(e) => setEditCategoriaId(e.target.value)}
                        >
                          {categorias.map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() =>
                            guardarEdicionGimnasta(inscripcion.gimnastas.id)
                          }
                        >
                          Guardar cambios
                        </button>

                        <button onClick={cancelarEdicion}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <h3>
                          {inscripcion.gimnastas.apellido},{' '}
                          {inscripcion.gimnastas.nombre}
                        </h3>

                        <p>Club: {inscripcion.gimnastas.club}</p>
                        <p>Profe: {inscripcion.gimnastas.profe}</p>
                        <p>Nivel: {inscripcion.gimnastas.niveles?.nombre}</p>
                        <p>
                          Categoría:{' '}
                          {inscripcion.gimnastas.categorias?.nombre}
                        </p>

                        <button onClick={() => iniciarEdicion(inscripcion)}>
                          Editar
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div
              className={
                vistaAdmin === 'puntajes'
                  ? 'admin-section active'
                  : 'admin-section'
              }
            >
              <h2>Puntajes cargados</h2>

              {puntajesCargados.length === 0 ? (
                <p>No hay puntajes cargados en este torneo.</p>
              ) : (
                puntajesCargados.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#f5f5f5',
                      padding: '15px',
                      borderRadius: '12px',
                      marginTop: '10px'
                    }}
                  >
                    <h3>
                      {p.gimnastas?.apellido}, {p.gimnastas?.nombre}
                    </h3>

                    <p>Club: {p.gimnastas?.club}</p>
                    <p>Aparato: {p.aparatos?.nombre}</p>
                    <p>Juez: {p.jueces?.nombre}</p>

                    {puntajeEditandoId === p.id ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={editPuntaje}
                          onChange={(e) => setEditPuntaje(e.target.value)}
                        />

                        <button onClick={() => guardarEdicionPuntaje(p.id)}>
                          Guardar
                        </button>

                        <button onClick={cancelarEdicionPuntaje}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          Puntaje: <strong>{p.puntaje}</strong>
                        </p>

                        <button onClick={() => iniciarEdicionPuntaje(p)}>
                          Editar puntaje
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
