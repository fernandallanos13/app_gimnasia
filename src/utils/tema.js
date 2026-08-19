export const COLOR_PRIMARIO_DEFAULT = '#c1121f'
export const COLOR_SECUNDARIO_DEFAULT = '#e5383b'

/**
 * Aplica los colores de un club como variables CSS globales.
 * Si no se pasa club (o no tiene colores propios), vuelve a los
 * colores por defecto de GymScore.
 */
export function aplicarTemaClub(club) {
  const root = document.documentElement

  root.style.setProperty(
    '--color-primario',
    club?.color_primario || COLOR_PRIMARIO_DEFAULT
  )

  root.style.setProperty(
    '--color-secundario',
    club?.color_secundario || COLOR_SECUNDARIO_DEFAULT
  )
}

export function resetearTema() {
  aplicarTemaClub(null)
}
