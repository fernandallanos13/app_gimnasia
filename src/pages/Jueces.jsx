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
      .eq('codigo', codigoTorneo)
      .eq('estado', 'activo')
      .single()

    if (errorTorneo || !torneoEncontrado) {
      if (torneoEncontrado.estado === 'cerrado') {

  alert('Este torneo está cerrado')

  return
}
      alert('Código de torneo incorrecto o torneo no activo')
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

    setGimnastasGrupo(filtradas)
  }

  function cambiarPuntaje(gimnastaId, valor) {
    if (valor === '') {
      setPuntajes({
        ...puntajes,
        [gimnastaId]: ''
      })
      return
    }

    const numero = Number(valor)

    if (numero < 0 || numero > 99) {
      alert('El puntaje debe ser entre 0 y 99')
      return
    }

    setPuntajes({
      ...puntajes,
      [gimnastaId]: valor
    })
  }

  async function guardarPuntajes() {
    if (!aparatoSeleccionado || !nivelSeleccionado || !categoriaSeleccionada) {
      alert('Seleccioná aparato, nivel y categoría')
      return
    }

    if (gimnastasGrupo.length === 0) {
      alert('No hay gimnastas para puntuar')
      return
    }

    const faltanPuntajes = gimnastasGrupo.some((item) => {
      const gimnastaId = item.gimnastas.id
      return puntajes[gimnastaId] === undefined || puntajes[gimnastaId] === ''
    })

    if (faltanPuntajes) {
      alert('Completá todos los puntajes. Si una gimnasta está ausente, poné 0.')
      return
    }

    const registros = gimnastasGrupo.map((item) => ({
      torneo_id: torneo.id,
      gimnasta_id: item.gimnastas.id,
      juez_id: juez.id,
      aparato_id: Number(aparatoSeleccionado),
      puntaje: Number(puntajes[item.gimnastas.id])
    }))

    const { error } = await supabase
  .from('puntajes')
  .insert(registros)

if (error) {
  console.log(error)

  if (error.code === '23505') {
    alert('Este grupo ya fue cargado por este juez para este aparato. No se puede duplicar.')
  } else {
    alert('Error al guardar puntajes')
  }

  return
}

    alert('Puntajes guardados correctamente')
  }

  function cargarOtroGrupo() {
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

  useEffect(() => {
    obtenerAparatos()

    const juezGuardado = localStorage.getItem('juez')
    const torneoGuardado = localStorage.getItem('torneo')
    const aparatoGuardado = localStorage.getItem('aparatoSeleccionado')

    if (juezGuardado && torneoGuardado) {
      const juezParseado = JSON.parse(juezGuardado)
      const torneoParseado = JSON.parse(torneoGuardado)

      setJuez(juezParseado)
      setTorneo(torneoParseado)

      if (aparatoGuardado) {
        setAparatoSeleccionado(aparatoGuardado)
      }

      obtenerNiveles(torneoParseado.id)
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
        <div style={{ background: 'white', padding: '20px', borderRadius: '14px', width: '90%', maxWidth: '700px' }}>
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
            onChange={(e) => {
              setNivelSeleccionado(e.target.value)
              obtenerCategorias(e.target.value)
            }}
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

              {gimnastasGrupo.map((item) => (
                <div
                  key={item.gimnastas.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '15px',
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '10px',
                    marginTop: '10px'
                  }}
                >
                  <div>
                    <strong>
                      {item.gimnastas.apellido}, {item.gimnastas.nombre}
                    </strong>
                    <p>{item.gimnastas.club}</p>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="0-99"
                    value={puntajes[item.gimnastas.id] || ''}
                    onChange={(e) => cambiarPuntaje(item.gimnastas.id, e.target.value)}
                    style={{ width: '90px' }}
                  />
                </div>
              ))}

              <button
                onClick={guardarPuntajes}
                style={{ marginTop: '20px' }}
              >
                Guardar puntajes
              </button>

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