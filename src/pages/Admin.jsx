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

  const [vistaAdmin, setVistaAdmin] = useState('puntajes')
  const [mostrarInscriptas, setMostrarInscriptas] = useState(false)
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
        nombre_completo_normalizado,
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

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function existeGimnastaEnTorneo({ nombre, apellido, nivelId, categoriaId, ignorarGimnastaId = null }) {
  return gimnastasInscriptas.some((inscripcion) => {
    const g = inscripcion.gimnastas

    if (!g) return false

    if (ignorarGimnastaId && Number(g.id) === Number(ignorarGimnastaId)) {
      return false
    }

    return (
      normalizarTexto(g.nombre) === normalizarTexto(nombre) &&
      normalizarTexto(g.apellido) === normalizarTexto(apellido) &&
      Number(g.nivel_id) === Number(nivelId) &&
      Number(g.categoria_id) === Number(categoriaId)
    )
  })
}

  async function cargarGimnasta() {
  if (!torneoSeleccionado) {
    alert('No hay un torneo activo seleccionado')
    return
  }

  if (!nombreGimnasta || !apellidoGimnasta || !nivelId || !categoriaId) {
    alert('Completá nombre, apellido, nivel y categoría')
    return
  }

  const duplicada = existeGimnastaEnTorneo({
    nombre: nombreGimnasta,
    apellido: apellidoGimnasta,
    nivelId,
    categoriaId
  })

  if (duplicada) {
    alert('Esa gimnasta ya está cargada en este torneo con el mismo nivel y categoría.')
    return
  }

  const { data: gimnastaCreada, error: errorGimnasta } = await supabase
    .from('gimnastas')
    .insert([
      {
        nombre: nombreGimnasta.trim(),
        apellido: apellidoGimnasta.trim(),
        club: club.trim(),
        profe: profe.trim(),
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

  const nivelNombre =
    niveles.find((n) => String(n.id) === String(nivelId))?.nombre || ''

  const categoriaNombre =
    categorias.find((c) => String(c.id) === String(categoriaId))?.nombre || ''

const { error: errorCargaManual } = await supabase
  .from('cargas_manuales')
  .insert([
    {
      torneo_id: torneoSeleccionado.id,
      gimnasta_id: gimnastaCreada.id,
      nombre: nombreGimnasta.trim(),
      apellido: apellidoGimnasta.trim(),
      club: club.trim(),
      profe: profe.trim(),
      nivel: nivelNombre,
      categoria: categoriaNombre
    }
  ])

console.log('ERROR CARGA MANUAL:', errorCargaManual)

if (errorCargaManual) {
  alert('La gimnasta se cargó, pero NO se registró como carga manual.')
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
                profe,
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

        const nombreCompletoExcel = normalizar(`${nombre} ${apellido}`)

const yaExiste = inscripcionesExistentes.some((inscripcion) => {
  const g = inscripcion.gimnastas

  const nombreCompletoGuardado =
    g?.nombre_completo_normalizado ||
    normalizar(`${g?.nombre || ''} ${g?.apellido || ''}`)

  return (
    normalizar(nombreCompletoGuardado) === nombreCompletoExcel &&
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
  categoria_id: categoriaEncontrada.id,
  origen: 'manual',
  nombre_completo_normalizado: normalizar(`${nombre} ${apellido}`)
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
  if (!editNombre || !editApellido || !editNivelId || !editCategoriaId) {
    alert('Completá nombre, apellido, nivel y categoría')
    return
  }

  const duplicada = existeGimnastaEnTorneo({
    nombre: editNombre,
    apellido: editApellido,
    nivelId: editNivelId,
    categoriaId: editCategoriaId,
    ignorarGimnastaId: gimnastaId
  })

  if (duplicada) {
    alert('Ya existe otra gimnasta con ese nombre, apellido, nivel y categoría en este torneo.')
    return
  }

  const { error } = await supabase
    .from('gimnastas')
    .update({
      nombre: editNombre.trim(),
      apellido: editApellido.trim(),
      club: editClub.trim(),
      profe: editProfe.trim(),
      nivel_id: Number(editNivelId),
      categoria_id: Number(editCategoriaId)
    })
    .eq('id', gimnastaId)

  if (error) {
    console.log(error)
    alert('Error al editar gimnasta')
    return
  }

  const nivelNombre =
    niveles.find((n) => String(n.id) === String(editNivelId))?.nombre || ''

  const categoriaNombre =
    categorias.find((c) => String(c.id) === String(editCategoriaId))?.nombre || ''

  await supabase
    .from('cargas_manuales')
    .update({
      nombre: editNombre.trim(),
      apellido: editApellido.trim(),
      club: editClub.trim(),
      profe: editProfe.trim(),
      nivel: nivelNombre,
      categoria: categoriaNombre
    })
    .eq('gimnasta_id', gimnastaId)

  alert('Gimnasta editada')
  setGimnastaEditandoId(null)
  obtenerGimnastasInscriptas(torneoSeleccionado.id)
}

  async function eliminarGimnasta(inscripcion) {
  const g = inscripcion.gimnastas

  if (!g) return

  const confirmar = window.confirm(
    `¿Eliminar a ${g.apellido}, ${g.nombre} del torneo? También se borrarán sus puntajes cargados.`
  )

  if (!confirmar) return

  const { error: errorPuntajes } = await supabase
    .from('puntajes')
    .delete()
    .eq('torneo_id', torneoSeleccionado.id)
    .eq('gimnasta_id', g.id)

  if (errorPuntajes) {
    console.log(errorPuntajes)
    alert('Error al eliminar los puntajes de la gimnasta')
    return
  }

  await supabase
    .from('cargas_manuales')
    .delete()
    .eq('gimnasta_id', g.id)

  const { error: errorInscripcion } = await supabase
    .from('inscripciones')
    .delete()
    .eq('id', inscripcion.id)

  if (errorInscripcion) {
    console.log(errorInscripcion)
    alert('Error al eliminar la inscripción')
    return
  }

  const { error: errorGimnasta } = await supabase
    .from('gimnastas')
    .delete()
    .eq('id', g.id)

  if (errorGimnasta) {
    console.log(errorGimnasta)
    alert('La inscripción se eliminó, pero hubo error al borrar la gimnasta')
    return
  }

  alert('Gimnasta eliminada')
  obtenerGimnastasInscriptas(torneoSeleccionado.id)
  obtenerPuntajesCargados(torneoSeleccionado.id)
}

  async function obtenerPuntajesCargados(torneoId) {
  const { data, error } = await supabase
    .from('puntajes')
    .select(`
      id,
      torneo_id,
      gimnasta_id,
      aparato_id,
      juez_id,
      puntaje,
      gimnastas (
        id,
        nombre,
        apellido,
        club,
        niveles (nombre),
        categorias (nombre)
      ),
      aparatos (
        id,
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
    const confirmar = confirm(
      '¿Seguro que querés cerrar este torneo? Se limpiarán los jueces logueados y las cargas manuales de este torneo.'
    )

    if (!confirmar) return

    const { error: errorJuecesLogueados } = await supabase
      .from('juez_grupos')
      .delete()
      .eq('torneo_id', torneoId)

    if (errorJuecesLogueados) {
      console.log(errorJuecesLogueados)
      alert('Error al limpiar los jueces logueados del torneo')
      return
    }

    const { error: errorCargasManuales } = await supabase
      .from('cargas_manuales')
      .delete()
      .eq('torneo_id', torneoId)

    if (errorCargasManuales) {
      console.log(errorCargasManuales)
      alert('Error al limpiar las cargas manuales del torneo')
      return
    }

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

    alert('Torneo cerrado. Se limpiaron jueces logueados y cargas manuales de este torneo.')

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

  useEffect(() => {
    const torneoActivo = torneos.find((torneo) => torneo.estado !== 'cerrado')

    if (!torneoActivo) {
      setTorneoSeleccionado(null)
      return
    }

    if (torneoSeleccionado?.id === torneoActivo.id) return

    setTorneoSeleccionado(torneoActivo)
    obtenerGimnastasInscriptas(torneoActivo.id)
    obtenerPuntajesCargados(torneoActivo.id)
  }, [torneos, torneoSeleccionado?.id])

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
      {mostrarHistoricos
        ? 'Ocultar torneos históricos'
        : 'Ver torneos históricos'}
    </button>

    <button onClick={() => navigate('/admin-inscripciones')}>
  Ver inscripciones
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

              <button
                onClick={() =>
                  exportarResultadosExcelPorTorneo(torneo)
                }
              >
                Descargar Excel
              </button>
            </div>
          ))
        )}
      </div>
    )}

    <div className="admin-top-grid">

      <div className="admin-box">
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

      <div className="admin-box">
        <h2>Torneo activo</h2>

        {torneosActivos.length === 0 ? (
  <p>No hay torneos activos.</p>
) : torneosActivos.length > 1 ? (
  <>
    <p style={{ color: '#c1121f', fontWeight: 'bold' }}>
      ⚠️ Hay más de un torneo activo. Cerrá los que no correspondan para evitar mezclar datos.
    </p>

    {torneosActivos.map((torneo) => (
      <div
        key={torneo.id}
        style={{
          background: 'white',
          padding: '14px',
          borderRadius: '14px',
          marginTop: '12px'
        }}
      >
        <h3>{torneo.nombre}</h3>
        <p><strong>Código:</strong> {torneo.codigo}</p>

        <button
          className="danger"
          onClick={() => cerrarTorneo(torneo.id)}
        >
          Cerrar este torneo
        </button>
      </div>
    ))}
  </>
) : (
  <>
            <h3>{torneoSeleccionado?.nombre}</h3>

            <p>
              <strong>Código:</strong>{' '}
              {torneoSeleccionado?.codigo}
            </p>

            <div className="admin-box-actions">

              <button
                onClick={() =>
                  toggleResultadosPublicos(
                    torneoSeleccionado.id,
                    torneoSeleccionado.resultados_publicos
                  )
                }
              >
                {torneoSeleccionado?.resultados_publicos
                  ? 'Ocultar resultados'
                  : 'Publicar resultados'}
              </button>

              <button onClick={copiarLinkPublico}>
                Copiar link público
              </button>

              <button
                className="danger"
                onClick={() =>
                  cerrarTorneo(torneoSeleccionado.id)
                }
              >
                Cerrar torneo
              </button>

            </div>

            <div className="qr-box">
              <p>Escaneá para ver resultados</p>

              <QRCodeCanvas
                value={`${window.location.origin}/resultados`}
                size={140}
              />

              <button
                onClick={() =>
                  descargarQR(torneoSeleccionado.nombre)
                }
              >
                Descargar QR
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {torneoSeleccionado && (

      <div className="admin-clean-dashboard">

        <section className="admin-box">

          <h2>Gestión de inscripciones</h2>

          <p>
            {gimnastasInscriptas.length} gimnasta(s)
            inscripta(s)
          </p>

          <div className="admin-box-actions">

            <button
              onClick={() =>
                navigate('/admin/inscriptas', {
  state: {
    gimnastasInscriptas,
    niveles,
    categorias
  }
})
              }
            >
              Ver inscriptas
            </button>

            <button
  onClick={() =>
    navigate('/admin/totales', {
      state: {
        gimnastasInscriptas
      }
    })
  }
>
  Ver totales por categoría
</button>

          </div>

          <h3 style={{ marginTop: '20px' }}>
            Importar desde Excel
          </h3>

          <button onClick={() => navigate('/admin/cargas-manuales')}>
  Ver cargas manuales
</button>

          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) =>
              setArchivoExcel(e.target.files[0])
            }
          />

          {archivoExcel && (
            <p className="helper-text">
              Archivo seleccionado:
              <strong> {archivoExcel.name}</strong>
            </p>
          )}

          <button
            onClick={importarExcel}
            disabled={importandoExcel}
          >
            {importandoExcel
              ? 'Importando...'
              : 'Cargar Excel'}
          </button>

        <button
  onClick={() =>
    navigate('/admin/turnos', {
      state: {
        gimnastasInscriptas,
        torneoSeleccionado
      }
    })
  }
>
  Turnos
</button>

        </section>

        <section className="admin-box">

          <h2>Cargar gimnasta</h2>

          <input
            type="text"
            placeholder="Nombre"
            value={nombreGimnasta}
            onChange={(e) =>
              setNombreGimnasta(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Apellido"
            value={apellidoGimnasta}
            onChange={(e) =>
              setApellidoGimnasta(e.target.value)
            }
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

          <select
            value={nivelId}
            onChange={(e) => setNivelId(e.target.value)}
          >
            <option value="">
              Seleccionar nivel
            </option>

            {niveles.map((nivel) => (
              <option
                key={nivel.id}
                value={nivel.id}
              >
                {nivel.nombre}
              </option>
            ))}
          </select>

          <select
            value={categoriaId}
            onChange={(e) =>
              setCategoriaId(e.target.value)
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {categorias.map((categoria) => (
              <option
                key={categoria.id}
                value={categoria.id}
              >
                {categoria.nombre}
              </option>
            ))}
          </select>

          <button onClick={cargarGimnasta}>
            Cargar gimnasta
          </button>

        </section>

        

        <section className="admin-box">

          <h2>Puntajes</h2>

          <p>
            Consultá y editá los puntajes cargados.
          </p>

          <button
  onClick={() =>
    navigate('/admin/puntajes', {
      state: {
        puntajesCargados,
        gimnastasInscriptas,
        torneoSeleccionado
      }
    })
  }
>
  Ver puntajes
</button>
          <button
  onClick={() =>
    navigate('/admin/podios', {
      state: {
        puntajesCargados,
        gimnastasInscriptas
      }
    })
  }
>
  Ver podios
</button>

<button onClick={() => navigate('/admin/jueces')}>
  Ver jueces logueados
</button>

        </section>

      </div>
    )}

  </div>
)
}

export default Admin
