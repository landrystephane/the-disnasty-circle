'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './scanner.module.css'

type ScanResult = {
  valid: boolean
  status?: string
  holder?: string
  event?: string
  phase?: string
  ticketNumber?: number
  totalTickets?: number
  hasMask?: boolean
  maskInstruction?: string
  wantsMask?: boolean
  reason?: string
  usedAt?: string
}

export default function ScannerPage() {
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [scanning, setScanning]       = useState(false)
  const [manualCode, setManualCode]   = useState('')
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    setCameraError('')
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
      scanLoop()
    } catch {
      setCameraError('Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function scanLoop() {
    if (!videoRef.current) return
    // Use BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['qr_code'] })
      const loop = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            stopCamera()
            await validate(barcodes[0].rawValue)
            return
          }
        } catch {}
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }
  }

  async function validate(code: string) {
    const operatorData = localStorage.getItem('staff_session')
    const operator = operatorData ? JSON.parse(operatorData).name : 'Scanner'

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: code, operatorName: operator }),
    })
    const data = await res.json()
    setResult(data)
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    await validate(manualCode.trim())
    setManualCode('')
  }

  function reset() {
    setResult(null)
    setManualCode('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={`font-serif ${styles.title}`}>Scanner QR</h1>
          <p className={styles.subtitle}>Scannez le QR code du billet à l&apos;entrée de la soirée</p>
        </div>

        {/* Result */}
        {result && (
          <div className={`${styles.result} ${result.valid ? styles.resultValid : styles.resultInvalid}`}>
            <div className={styles.resultIcon}>
              {result.valid ? '✅' : result.status === 'ALREADY_USED' ? '⚠️' : '❌'}
            </div>
            <div className={styles.resultBody}>
              {result.valid ? (
                <>
                  <h2 className={`font-serif ${styles.resultTitle}`} style={{ color: 'var(--success)' }}>
                    ✓ ENTRÉE VALIDÉE
                  </h2>
                  <p className={styles.resultHolder}>{result.holder}</p>
                  {result.ticketNumber && result.totalTickets && (
                    <p style={{ color: 'var(--gold)', fontWeight: 700, margin: '0.25rem 0', fontSize: '1rem' }}>
                      🎟️ Billet {result.ticketNumber} sur {result.totalTickets}
                    </p>
                  )}
                  <p className={styles.resultMeta}>{result.event} · {result.phase}</p>

                  {result.hasMask ? (
                    <div style={{
                      margin: '0.75rem 0',
                      padding: '0.8rem 1rem',
                      background: 'rgba(212, 175, 55, 0.2)',
                      border: '2px solid var(--gold)',
                      borderRadius: '8px',
                      color: 'var(--gold)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      letterSpacing: '0.04em'
                    }}>
                      🎭 MASQUE INCLUS : Remettre 1 masque à l&apos;invité !
                    </div>
                  ) : (
                    <div style={{
                      margin: '0.75rem 0',
                      padding: '0.6rem 0.8rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}>
                      ❌ SANS MASQUE FOURNI (L&apos;invité apporte son propre masque)
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className={`font-serif ${styles.resultTitle}`} style={{
                    color: result.status === 'ALREADY_USED' ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {result.status === 'ALREADY_USED' ? 'DÉJÀ UTILISÉ' : 'BILLET INVALIDE'}
                  </h2>
                  <p className={styles.resultReason}>{result.reason}</p>
                  {result.holder && <p className={styles.resultMeta}>Titulaire : {result.holder}</p>}
                  {result.usedAt && (
                    <p className={styles.resultMeta}>
                      Utilisé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.usedAt))}
                    </p>
                  )}
                </>
              )}
            </div>
            <button onClick={reset} className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }}>
              Scanner un autre billet
            </button>
          </div>
        )}

        {!result && (
          <>
            {/* Camera */}
            <div className={styles.cameraSection}>
              <div className={`${styles.cameraFrame} ${scanning ? styles.cameraActive : ''}`}>
                <video ref={videoRef} className={styles.video} playsInline muted />
                {!scanning && (
                  <div className={styles.cameraPlaceholder}>
                    <span>📷</span>
                    <p>Caméra inactive</p>
                  </div>
                )}
                {scanning && <div className={styles.scanLine} />}
              </div>

              {cameraError && <p className={styles.cameraError}>{cameraError}</p>}

              <div className={styles.cameraButtons}>
                {!scanning ? (
                  <button onClick={startCamera} className="btn btn-gold btn-lg">
                    📷 Activer la caméra
                  </button>
                ) : (
                  <button onClick={stopCamera} className="btn btn-outline">
                    ⏹ Arrêter
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="divider-gold">Ou saisir manuellement</div>

            {/* Manual */}
            <form onSubmit={handleManual} className={styles.manualForm}>
              <input
                type="text"
                className="form-input"
                placeholder="Code QR ou référence du billet..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
              />
              <button type="submit" className="btn btn-gold" disabled={!manualCode.trim()}>
                Valider →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
