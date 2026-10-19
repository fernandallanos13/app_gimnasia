import { useLocation } from 'react-router-dom'
import './CreditoGymScore.css'

const WHATSAPP_URL = 'https://wa.me/5493571323650?text=Hola%20Fernanda%21%20Vi%20GymScore%20en%20un%20torneo%20de%20gimnasia%20y%20quisiera%20recibir%20informaci%C3%B3n%20para%20usarlo%20en%20nuestro%20torneo.'

export default function CreditoGymScore() {
  const { pathname } = useLocation()
  if (!['/', '/resultados', '/inscripcion'].includes(pathname)) return null

  return (
    <aside className="gym-credito" aria-label="Desarrollo y consultas de GymScore">
      <div className="gym-credito__texto">
        <strong>¿Querés GymScore en tu torneo?</strong>
        <span>Software desarrollado por <b>Fernanda Llanos Aberastain</b></span>
      </div>
      <a className="gym-credito__contacto" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Consultar por GymScore a través de WhatsApp">
        <span aria-hidden="true">✆</span> <span>WhatsApp</span>
      </a>
    </aside>
  )
}
