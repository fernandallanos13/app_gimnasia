import { useEffect, useState } from 'react'

import { supabase } from '../services/supabase'

function Jueces() {
  const [nombreJuez, setNombreJuez] = useState('')
  const [codigoTorneo, setCodigoTorneo] = useState('')

  const [torneo, setTorneo] = useState(null)
  const [juez, setJuez] = useState(null)

  const [aparatos, setAparatos] = useState([])
  const [niveles, setNiveles] = useState([])
  const [categorias, setCategorias] = useState([])

  const [aparatoSeleccionado, setAparatoSeleccionado] = useState('')
  const [nivelSeleccionado, setNivelSeleccionado] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')

  const [gimnastasGrupo, setGimnastasGrupo] = useState([])
  const [puntajes, setPuntajes] = useState({})

  async function ingresarJuez() {
    if (!nombreJuez || !codigoTorneo) {
      alert('Completá nombre y código de torneo')
      return
    }

    const { data: torneoEncontrado, error: errorTorneo } = await supabase
      .from('torneos')
      .select('*')
      .ilike('codigo', codigoTorneo.trim())
      .eq('estado', 'activo')
      .single()

    if (errorTorneo || !torneoEncontrado) {
      alert('Código de torneo incorrecto o torneo no activo')
      return
    }

    if (torneoEncontrado.estado === 'cerrado') {
      alert('Este torneo ya está cerrado')
      return
    }

    const { data: juezCreado, error: errorJuez } = await supabase
      .from('jueces')
      .insert([
        {
          nombre: nombreJuez,
          torneo_id: torneoEncontrado.id
        }
      ])
      .select()
      .single()

    if (errorJuez) {
      console.log(errorJuez)
      alert('Error al ingresar juez')
      return
    }

    setTorneo(torneoEncontrado)
    setJuez(juezCreado)

    localStorage.setItem('juez', JSON.stringify(juezCreado))
    localStorage.setItem('torneo', JSON.stringify(torneoEncontrado))

    obtenerNiveles(torneoEncontrado.id)
  }

  async function obtenerAparatos() {
    const { data, error } = await supabase
      .from('aparatos')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.log(error)
    } else {
      setAparatos(data)
    }
  }

  async function obtenerNiveles(torneoId) {
    const { data, error } = await supabase
      .from('inscripciones')
      .select(`
        gimnastas (
          nivel_id,
          niveles (
            id,
            nombre
          )
        )
      `)
      .eq('torneo_id', torneoId)

    if (error) {
      console.log(error)
      return
    }

    const nivelesMap = new Map()

    data.forEach((item) => {
      const nivel = item.gimnastas?.niveles

      if (nivel) {
        nivelesMap.set(nivel.id, nivel)
      }
    })

    setNiveles(Array.from(nivelesMap.values()))
  }

  async function obtenerCategorias(nivelId) {
    setNivelSeleccionado(nivelId)
    setCategoriaSeleccionada('')
    setGimnastasGrupo([])
    setPuntajes({})

    const { data, error } = await supabase
      .from('inscripciones')
      .select(`
        gimnastas (
          nivel_id,
          categoria_id,
          categorias (
            id,
            nombre
          )
        )
      `)
      .eq('torneo_id', torneo.id)

    if (error) {
      console.log(error)
      return
    }

    const categoriasMap = new Map()

    data.forEach((item) => {
      const gimnasta = item.gimnastas

      if (
        String(gimnasta?.nivel_id) === String(nivelId) &&
        gimnasta?.categorias
      ) {
        categoriasMap.set(
          gimnasta.categorias.id,
          gimnasta.categorias
        )
      }
    })

    setCategorias(Array.from(categoriasMap.values()))
  }

  async function obtenerGimnastasDelGrupo(categoriaId) {
  setCategoriaSeleccionada(categoriaId)
  setGimnastasGrupo([])
  setPuntajes({})

  if (!aparatoSeleccionado) {
    alert('Primero seleccioná un aparato')
    setCategoriaSeleccionada('')
    return
  }

  if (!torneo?.id || !juez?.id || !nivelSeleccionado || !categoriaId) {
    alert('Faltan datos para registrar el grupo del juez')
    return
  }

  const claveGrupo = `grupo-finalizado-${torneo.id}-${juez.id}-${aparatoSeleccionado}-${nivelSeleccionado}-${categoriaId}`

  if (localStorage.getItem(claveGrupo) === 'true') {
    alert('Este grupo ya fue finalizado. Pedile al admin que edite los puntajes si hay un error.')
    setCategoriaSeleccionada('')
    return
  }

  const { error: errorGrupo } = await supabase
    .from('juez_grupos')
    .upsert(
      {
        torneo_id: torneo.id,
      juez_id: juez.id,
      aparato_id: Number(aparatoSeleccionado),
      nivel_id: Number(nivelSeleccionado),
      categoria_id: Number(categoriaId),
      finalizado: false
    },
    {
      onConflict: 'torneo_id,juez_id,aparato_id,nivel_id,categoria_id'
    }
  )

console.log('ERROR GRUPO:', errorGrupo)
console.log('DATOS GRUPO:', {
  torneo_id: torneo.id,
  juez_id: juez.id,
  aparato_id: Number(aparatoSeleccionado),
  nivel_id: Number(nivelSeleccionado),
  categoria_id: Number(categoriaId)
})

  if (errorGrupo) {
    console.log(errorGrupo)
    alert('No se pudo registrar el grupo del juez')
    return
  }

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
        categoria_id
      )
    `)
    .eq('torneo_id', torneo.id)

  if (error) {
    console.log(error)
    alert('Error al traer gimnastas')
    return
  }

  const filtradas = data.filter((item) => {
    const g = item.gimnastas

    return (
      String(g?.nivel_id) === String(nivelSeleccionado) &&
      String(g?.categoria_id) === String(categoriaId)
    )
  })

  const ordenadas = filtradas.sort((a, b) => {
    const apellidoA = a.gimnastas?.apellido?.toLowerCase() || ''
    const apellidoB = b.gimnastas?.apellido?.toLowerCase() || ''

    return apellidoA.localeCompare(apellidoB)
  })

  setGimnastasGrupo(ordenadas)

  const idsGimnastas = ordenadas.map((item) => item.gimnastas.id)

  if (idsGimnastas.length === 0) {
    return
  }

  const { data: puntajesExistentes, error: errorPuntajes } = await supabase
    .from('puntajes')
    .select('*')
    .eq('torneo_id', torneo.id)
    .eq('juez_id', juez.id)
    .eq('aparato_id', Number(aparatoSeleccionado))
    .in('gimnasta_id', idsGimnastas)

  if (!errorPuntajes && puntajesExistentes) {
    const puntajesPrevios = {}

    puntajesExistentes.forEach((p) => {
      puntajesPrevios[p.gimnasta_id] = p.puntaje
    })

    setPuntajes(puntajesPrevios)
  }
}
  async function guardarPuntajeIndividual(gimnastaId, valor) {
    if (!aparatoSeleccionado || !torneo || !juez) return

    if (valor === '' || Number(valor) < 0 || Number(valor) > 99) {
      return
    }

    const { error } = await supabase
      .from('puntajes')
      .upsert(
        {
          torneo_id: torneo.id,
          gimnasta_id: gimnastaId,
          juez_id: juez.id,
          aparato_id: Number(aparatoSeleccionado),
          puntaje: Number(valor)
        },
        {
          onConflict: 'torneo_id,gimnasta_id,juez_id,aparato_id'
        }
      )

    if (error) {
      console.log(error)
      alert('Error al autoguardar puntaje')
    }
  }

  function cambiarPuntaje(gimnastaId, valor) {
    if (valor !== '' && (Number(valor) < 0 || Number(valor) > 99)) {
      alert('El puntaje debe ser entre 0 y 99')
      return
    }

    if (grupoEstaFinalizado()) {
  alert('Este grupo ya fue finalizado. No podés modificar los puntajes.')
  return
}

    setPuntajes({
      ...puntajes,
      [gimnastaId]: valor
    })

    guardarPuntajeIndividual(gimnastaId, valor)
  }

  function obtenerClaveGrupo() {
  return `grupo-finalizado-${torneo?.id}-${juez?.id}-${aparatoSeleccionado}-${nivelSeleccionado}-${categoriaSeleccionada}`
}

function grupoEstaFinalizado() {
  return localStorage.getItem(obtenerClaveGrupo()) === 'true'
}

async function cargarOtroGrupo() {
  if (torneo && juez && aparatoSeleccionado && nivelSeleccionado && categoriaSeleccionada) {
    localStorage.setItem(obtenerClaveGrupo(), 'true')

    await supabase
      .from('juez_grupos')
      .update({ finalizado: true })
      .eq('torneo_id', torneo.id)
      .eq('juez_id', juez.id)
      .eq('aparato_id', Number(aparatoSeleccionado))
      .eq('nivel_id', Number(nivelSeleccionado))
      .eq('categoria_id', Number(categoriaSeleccionada))
  }

  setNivelSeleccionado('')
  setCategoriaSeleccionada('')
  setCategorias([])
  setGimnastasGrupo([])
  setPuntajes({})
}

  function salirJuez() {
    localStorage.removeItem('juez')
    localStorage.removeItem('torneo')
    localStorage.removeItem('aparatoSeleccionado')

    setJuez(null)
    setTorneo(null)
    setAparatoSeleccionado('')
    setNivelSeleccionado('')
    setCategoriaSeleccionada('')
    setCategorias([])
    setGimnastasGrupo([])
    setPuntajes({})
  }

  async function verificarTorneoGuardado(torneoGuardado) {
    const { data, error } = await supabase
      .from('torneos')
      .select('*')
      .eq('id', torneoGuardado.id)
      .single()

    if (error || !data) {
      localStorage.removeItem('juez')
      localStorage.removeItem('torneo')
      setJuez(null)
      setTorneo(null)
      return
    }

    if (data.estado === 'cerrado') {
      alert('Este torneo ya está cerrado')
      localStorage.removeItem('juez')
      localStorage.removeItem('torneo')
      localStorage.removeItem('aparatoSeleccionado')
      setJuez(null)
      setTorneo(null)
      setAparatoSeleccionado('')
      return
    }

    setTorneo(data)
    obtenerNiveles(data.id)
  }
const categoriaActual = categorias.find(
  (c) => String(c.id) === String(categoriaSeleccionada)
)

const esMiniaturas =
  String(categoriaActual?.nombre || '').toLowerCase().trim() === 'miniaturas'
  useEffect(() => {
    obtenerAparatos()

    const juezGuardado = localStorage.getItem('juez')
    const torneoGuardado = localStorage.getItem('torneo')
    const aparatoGuardado = localStorage.getItem('aparatoSeleccionado')

    if (juezGuardado && torneoGuardado) {
      const juezParseado = JSON.parse(juezGuardado)
      const torneoParseado = JSON.parse(torneoGuardado)

      setJuez(juezParseado)

      if (aparatoGuardado) {
        setAparatoSeleccionado(aparatoGuardado)
      }

      verificarTorneoGuardado(torneoParseado)
    }
  }, [])

  return (
    <div className="container">
      <h1>Panel Jueces</h1>

      {!torneo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
          <input
            type="text"
            placeholder="Nombre juez"
            value={nombreJuez}
            onChange={(e) => setNombreJuez(e.target.value)}
          />

          <input
            type="text"
            placeholder="Código torneo"
            value={codigoTorneo}
            onChange={(e) => setCodigoTorneo(e.target.value)}
          />

          <button onClick={ingresarJuez}>
            Ingresar
          </button>
        </div>
      )}

      {torneo && juez && (
        <div className="judge-card">
          <h2>Bienvenido/a {juez.nombre}</h2>
          <p>Torneo: {torneo.nombre}</p>

          <button onClick={salirJuez}>
            Salir
          </button>

          <hr style={{ margin: '20px 0' }} />

          <h3>Aparato</h3>

          <select
            value={aparatoSeleccionado}
            onChange={(e) => {
              setAparatoSeleccionado(e.target.value)
              localStorage.setItem('aparatoSeleccionado', e.target.value)
              setNivelSeleccionado('')
              setCategoriaSeleccionada('')
              setCategorias([])
              setGimnastasGrupo([])
              setPuntajes({})
            }}
          >
            <option value="">Seleccionar aparato</option>

            {aparatos.map((aparato) => (
              <option key={aparato.id} value={aparato.id}>
                {aparato.nombre}
              </option>
            ))}
          </select>

          <h3 style={{ marginTop: '20px' }}>Nivel</h3>

          <select
            value={nivelSeleccionado}
            onChange={(e) => obtenerCategorias(e.target.value)}
          >
            <option value="">Seleccionar nivel</option>

            {niveles.map((nivel) => (
              <option key={nivel.id} value={nivel.id}>
                {nivel.nombre}
              </option>
            ))}
          </select>

          {categorias.length > 0 && (
            <>
              <h3 style={{ marginTop: '20px' }}>Categoría</h3>

              <select
                value={categoriaSeleccionada}
                onChange={(e) => obtenerGimnastasDelGrupo(e.target.value)}
              >
                <option value="">Seleccionar categoría</option>

                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </>
          )}

          {gimnastasGrupo.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h2>Cargar puntajes</h2>
              <p style={{ marginTop: '8px' }}>
                Los puntajes se guardan automáticamente.
              </p>

              {gimnastasGrupo.map((item) => (
                <div
                  key={item.gimnastas.id}
                  className="score-row"
                >
                  <div>
                    <strong>
                      {item.gimnastas.apellido}, {item.gimnastas.nombre}
                    </strong>
                    <p>{item.gimnastas.club}</p>
                  </div>

                  {esMiniaturas ? (

  <button
    className={
      puntajes[item.gimnastas.id]
        ? 'mini-score-button active'
        : 'mini-score-button'
    }
    onClick={() =>
      cambiarPuntaje(item.gimnastas.id, 1)
    }
  >
    🙂
  </button>

) : (

  <input
    type="number"
    min="0"
    max="99"
    placeholder="0-99"
    value={puntajes[item.gimnastas.id] || ''}
    onChange={(e) =>
      cambiarPuntaje(
        item.gimnastas.id,
        e.target.value
      )
    }
  />

)}
                </div>
              ))}

              <button
                onClick={cargarOtroGrupo}
                style={{ marginTop: '15px' }}
              >
                Finalicé este grupo / Cargar otro grupo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Jueces