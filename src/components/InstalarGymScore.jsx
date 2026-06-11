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
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'

    if (isAppInstalled() || dismissed) return

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

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent)

    if (isIos && isSafari) {
      setShowIosHelp(true)
    }

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
    setShowIosHelp(false)
  }

  if (!showInstallCard && !showIosHelp) return null

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar GymScore">
      <div className="install-banner__icon">📱</div>

      <div className="install-banner__content">
        <h2>Instalar GymScore</h2>
        <p>Accedé más rápido desde tu celular durante el torneo.</p>

        {showIosHelp && !showInstallCard && (
          <p className="install-banner__hint">
            En iPhone: tocá Compartir y después “Agregar a pantalla de inicio”.
          </p>
        )}
      </div>

      <div className="install-banner__actions">
        {showInstallCard && (
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