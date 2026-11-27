import { useEffect, useState } from 'react'

interface InstallPrompt extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const finish = () => { setPrompt(null); setInstalled(true) }
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', finish)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', finish)
    }
  }, [])

  async function install() {
    if (!prompt) return
    setPrompt(null)
    try {
      const result = await prompt.prompt()
      if (result.outcome === 'accepted') setInstalled(true)
    } catch {
      // The browser may invalidate the event when its window is no longer active.
    }
  }

  return { canInstall: !installed && prompt !== null, iosHelp: !installed && isAppleMobile(), install }
}
