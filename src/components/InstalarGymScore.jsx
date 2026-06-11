import { useEffect, useState } from 'react'

const INSTALL_DISMISSED_KEY = 'gymscore_install_dismissed'

function isAppInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function InstalarGymScore() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallCard, setShowInstallCard] = useState(false)

  useEffect(() => {
    if (isAppInstalled()) return

    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)

    if (dismissed !== 'true') {
      setShowInstallCard(true)
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setShowInstallCard(true)
    }

    const handleAppInstalled = () => {
      setShowInstallCard(false)
      setDeferredPrompt(null)
      localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setShowInstallCard(false)
  }

  const dismissInstallCard = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    setShowInstallCard(false)
  }

  if (!showInstallCard) return null

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar GymScore">
      <div className="install-banner__icon">📱</div>

      <div className="install-banner__content">
        <h2>Instalar GymScore</h2>
        <p>Accedé más rápido desde tu celular durante el torneo.</p>

        {!deferredPrompt && (
          <p className="install-banner__hint">
            Si no aparece el botón automático, tocá los tres puntitos de Chrome y elegí
            “Instalar app” o “Agregar a pantalla principal”.
          </p>
        )}
      </div>

      <div className="install-banner__actions">
        {deferredPrompt && (
          <button type="button" className="install-banner__primary" onClick={installApp}>
            Instalar aplicación
          </button>
        )}

        <button type="button" className="install-banner__secondary" onClick={dismissInstallCard}>
          Ahora no
        </button>
      </div>
    </div>
  )
}

export default InstalarGymScore