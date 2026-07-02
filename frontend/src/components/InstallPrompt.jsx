import { useEffect, useState } from 'react'
import ojtLogo from '../assets/ojt_logo.png'

// ── Detect iOS Safari ────────────────────────────────────────────────────────
function isIosSafari() {
  const ua = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // Safari on iOS doesn't have "CriOS" (Chrome) or "FxiOS" (Firefox)
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua)
  return isIos && isSafari
}

// ── iOS hint: steps with icons ───────────────────────────────────────────────
function IosHint({ onDismiss }) {
  return (
    <>
      {/* Dim backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'pwa-fade-in 0.3s ease',
        }}
      />

      {/* Bottom card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to install on iOS"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(20,184,166,0.25)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '20px 24px 40px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          animation: 'pwa-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 18px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <img
            src={ojtLogo}
            alt="OJT System"
            style={{
              width: 52, height: 52, borderRadius: 13,
              background: '#030712', padding: 5,
              border: '1px solid rgba(20,184,166,0.3)',
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>
              Install OJT System
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
              Add to your iPhone / iPad Home Screen
            </p>
          </div>
        </div>

        {/* Steps */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {[
            {
              num: '1',
              icon: (
                // Safari Share icon (box with up-arrow)
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              ),
              label: 'Tap the',
              highlight: 'Share',
              suffix: 'button at the bottom of Safari',
            },
            {
              num: '2',
              icon: (
                // Plus-square icon
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              ),
              label: 'Scroll and tap',
              highlight: '"Add to Home Screen"',
              suffix: '',
            },
            {
              num: '3',
              icon: (
                // Checkmark icon
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
              label: 'Tap',
              highlight: '"Add"',
              suffix: 'in the top-right corner',
            },
          ].map((step, i, arr) => (
            <div key={step.num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              {/* Step number badge */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(20,184,166,0.15)',
                border: '1px solid rgba(20,184,166,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#14b8a6',
                flexShrink: 0,
              }}>{step.num}</div>

              {/* Icon */}
              <div style={{ flexShrink: 0 }}>{step.icon}</div>

              {/* Text */}
              <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.4 }}>
                {step.label}{' '}
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{step.highlight}</span>
                {step.suffix ? ' ' + step.suffix : ''}
              </p>
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <button
          id="pwa-ios-dismiss-btn"
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#64748b',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          Maybe later
        </button>

        {/* Animated arrow pointing to Share button */}
        <div style={{
          position: 'absolute',
          bottom: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <svg
            width="28" height="28" viewBox="0 0 24 24"
            fill="#14b8a6"
            style={{ animation: 'pwa-bounce 1.2s ease-in-out infinite', filter: 'drop-shadow(0 0 6px rgba(20,184,166,0.8))' }}
          >
            <path d="M12 20l-8-8h5V4h6v8h5z"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pwa-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pwa-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </>
  )
}

// ── Android / Desktop install sheet ─────────────────────────────────────────
function AndroidSheet({ onInstall, onDismiss }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'pwa-fade-in 0.3s ease',
        }}
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install OJT System app"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(20,184,166,0.2)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          animation: 'pwa-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 20px',
        }} />

        {/* Content row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <img
            src={ojtLogo}
            alt="OJT System"
            style={{
              width: 56, height: 56,
              borderRadius: 14, background: '#030712', padding: 6,
              border: '1px solid rgba(20,184,166,0.3)', flexShrink: 0,
            }}
          />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#f1f5f9', lineHeight: 1.3 }}>
              Install OJT System
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
              Add to your home screen for quick access — works offline too!
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="pwa-install-btn"
            onClick={onInstall}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(20,184,166,0.35)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(20,184,166,0.5)' }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 15px rgba(20,184,166,0.35)' }}
          >
            📲 Install App
          </button>
          <button
            id="pwa-dismiss-btn"
            onClick={onDismiss}
            style={{
              padding: '13px 20px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          >
            Not now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pwa-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) return

    // ── iOS Safari: no beforeinstallprompt — show manual hint instead
    if (isIosSafari() && !window.navigator.standalone) {
      setTimeout(() => setShowIos(true), 3000)
      return
    }

    // ── Android / Desktop: listen for browser install event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowAndroid(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShowAndroid(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowAndroid(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowAndroid(false)
    setShowIos(false)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (showIos) return <IosHint onDismiss={handleDismiss} />
  if (showAndroid) return <AndroidSheet onInstall={handleInstall} onDismiss={handleDismiss} />
  return null
}
