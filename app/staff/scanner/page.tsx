'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Script from 'next/script'
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
  const [scanStatus, setScanStatus]   = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
    setScanStatus('')
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  async function validate(code: string) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(200) } catch {}
    }

    const operatorData = localStorage.getItem('staff_session')
    const operator = operatorData ? JSON.parse(operatorData).name : 'Scanner'

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: code, operatorName: operator }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ valid: false, reason: 'Erreur réseau lors de la validation du billet.' })
    }
  }

  function startScanningLoop() {
    if (!videoRef.current) return

    let detector: any = null
    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {}
    }

    let lastCheckTime = 0

    const scanFrame = async (timestamp: number) => {
      if (!streamRef.current || !videoRef.current) return
      const video = videoRef.current

      if (timestamp - lastCheckTime > 120 && video.readyState >= 2 && video.videoWidth > 0) {
        lastCheckTime = timestamp

        // 1. BarcodeDetector native (Chrome Android)
        if (detector) {
          try {
            const barcodes = await detector.detect(video)
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              stopCamera()
              await validate(barcodes[0].rawValue)
              return
            }
          } catch {}
        }

        // 2. jsQR universal (iOS Safari, iPhone, Android, Firefox)
        const jsQR = (window as any).jsQR
        if (jsQR) {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas')
          }
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            const scale = Math.min(1, 640 / video.videoWidth)
            canvas.width = Math.floor(video.videoWidth * scale)
            canvas.height = Math.floor(video.videoHeight * scale)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            })
            if (code && code.data) {
              stopCamera()
              await validate(code.data)
              return
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame)
    }

    animFrameRef.current = requestAnimationFrame(scanFrame)
  }

  async function startCamera() {
    setCameraError('')
    setResult(null)
    setScanStatus('Recherche de QR code active...')

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setScanning(true)
      startScanningLoop()
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError('Impossible d\'activer la caméra (' + (err?.name || 'Erreur') + '). Autorisez l\'accès caméra ou utilisez la saisie/photo.')
      setScanning(false)
    }
  }

  // Handle Photo Scan from File or Gallery
  async function handleFileScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const jsQR = (window as any).jsQR
    if (!jsQR) {
      alert('Module de décodage en cours de chargement. Veuillez patienter une seconde.')
      return
    }

    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data) {
          stopCamera()
          await validate(code.data)
        } else {
          alert('Aucun code QR détecté sur cette photo. Essayez de recadrer ou de bien centrer le QR code.')
        }
      }
    }
    img.src = URL.createObjectURL(file)
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
    startCamera()
  }

  return (
    <>
      {/* Universal QR Code decoding engine for iOS Safari & Android */}
      <Script
        src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
        strategy="afterInteractive"
      />

      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <h1 className={`font-serif ${styles.title}`}>Scanner QR</h1>
            <p className={styles.subtitle}>Scannez le billet avec la caméra ou importez une photo</p>
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
                    <p className={styles.resultHolder} style={{ fontSize: '1.25rem', margin: '0.4rem 0' }}>
                      {result.holder}
                    </p>
                    {result.ticketNumber && result.totalTickets && (
                      <p style={{ color: 'var(--gold)', fontWeight: 700, margin: '0.25rem 0', fontSize: '1rem' }}>
                        🎟️ Billet {result.ticketNumber} sur {result.totalTickets}
                      </p>
                    )}
                    <p className={styles.resultMeta}>{result.event} · {result.phase}</p>

                    {result.hasMask ? (
                      <div style={{
                        margin: '0.9rem 0',
                        padding: '0.9rem 1.1rem',
                        background: 'rgba(212, 175, 55, 0.2)',
                        border: '2px solid var(--gold)',
                        borderRadius: '10px',
                        color: 'var(--gold)',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        letterSpacing: '0.04em'
                      }}>
                        🎭 MASQUE INCLUS : Remettre 1 masque à l&apos;invité !
                      </div>
                    ) : (
                      <div style={{
                        margin: '0.9rem 0',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem'
                      }}>
                        ❌ ENTRÉE SIMPLE (Pas de masque fourni)
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className={`font-serif ${styles.resultTitle}`} style={{
                      color: result.status === 'ALREADY_USED' ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {result.status === 'ALREADY_USED' ? 'BILLET DÉJÀ UTILISÉ' : 'BILLET INVALIDE'}
                    </h2>
                    <p className={styles.resultReason}>{result.reason}</p>
                    {result.holder && <p className={styles.resultMeta}>Titulaire : {result.holder}</p>}
                    {result.usedAt && (
                      <p className={styles.resultMeta}>
                        Validé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.usedAt))}
                      </p>
                    )}
                  </>
                )}
              </div>
              <button onClick={reset} className="btn btn-gold btn-lg" style={{ marginTop: '1.25rem' }}>
                🔄 Scanner le billet suivant
              </button>
            </div>
          )}

          {!result && (
            <>
              {/* Camera Section */}
              <div className={styles.cameraSection}>
                <div className={`${styles.cameraFrame} ${scanning ? styles.cameraActive : ''}`}>
                  <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
                  {!scanning && (
                    <div className={styles.cameraPlaceholder}>
                      <span>📷</span>
                      <p>Caméra inactive</p>
                    </div>
                  )}
                  {scanning && <div className={styles.scanLine} />}
                </div>

                {scanning && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 500, animation: 'pulse 1.5s infinite' }}>
                    ✦ Pointez la caméra vers le QR code du billet...
                  </p>
                )}

                {cameraError && <p className={styles.cameraError}>{cameraError}</p>}

                <div className={styles.cameraButtons} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {!scanning ? (
                    <button onClick={startCamera} className="btn btn-gold btn-lg">
                      📷 Activer la caméra
                    </button>
                  ) : (
                    <button onClick={stopCamera} className="btn btn-outline">
                      ⏹ Arrêter la caméra
                    </button>
                  )}

                  {/* Photo scanner fallback */}
                  <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📁</span>
                    <span>Photo / Galerie QR</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileScan}
                    />
                  </label>
                </div>
              </div>

              {/* Divider */}
              <div className="divider-gold">Ou saisir manuellement</div>

              {/* Manual code */}
              <form onSubmit={handleManual} className={styles.manualForm}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Code QR ou URL du billet..."
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
    </>
  )
}
