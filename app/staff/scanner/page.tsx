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
  isTable?: boolean
  tableName?: string | null
  reason?: string
  usedAt?: string
  stats?: {
    present: number
    remaining: number
    total: number
    rate: number
  }
}

interface AttendanceStats {
  present: number
  remaining: number
  total: number
  rate: number
}

function playAudioTone(type: 'success' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // Note A5 joyeuse
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
      osc.start()
      osc.stop(ctx.currentTime + 0.22)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime) // Buzz grave
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    }
  } catch {}
}

export default function ScannerPage() {
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [scanning, setScanning]       = useState(false)
  const [manualCode, setManualCode]   = useState('')
  const [cameraError, setCameraError] = useState('')
  const [scanStatus, setScanStatus]   = useState('')
  const [attendance, setAttendance]   = useState<AttendanceStats>({
    present: 0,
    remaining: 0,
    total: 0,
    rate: 0,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/scan')
      const data = await res.json()
      if (data && typeof data.total === 'number') {
        setAttendance(data)
      }
    } catch (err) {
      console.warn('Attendance load error:', err)
    }
  }, [])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

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

      if (data.valid) {
        playAudioTone('success')
      } else {
        playAudioTone('error')
      }

      if (data.stats) {
        setAttendance(data.stats)
      } else {
        fetchAttendance()
      }
    } catch {
      playAudioTone('error')
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h1 className={`font-serif ${styles.title}`} style={{ margin: 0 }}>Scanner QR</h1>
                <p className={styles.subtitle} style={{ margin: '0.2rem 0 0' }}>Contrôle d&apos;accès en direct • THE DISNASTY CIRCLE</p>
              </div>
              <button
                onClick={fetchAttendance}
                className="btn btn-outline btn-sm"
                title="Actualiser la jauge d'invités"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                🔄 Jauge
              </button>
            </div>
          </div>

          {/* JAUGE D'AFFLUENCE EN DIRECT */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}>
            <div style={{
              background: 'rgba(46, 204, 113, 0.12)',
              border: '1px solid rgba(46, 204, 113, 0.35)',
              borderRadius: '12px',
              padding: '0.65rem 0.4rem',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2ecc71', display: 'block', lineHeight: 1.2 }}>
                {attendance.present}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                🟢 Présents
              </span>
            </div>

            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              padding: '0.65rem 0.4rem',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', display: 'block', lineHeight: 1.2 }}>
                {attendance.remaining}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                ⏳ En attente
              </span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.65rem 0.4rem',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'block', lineHeight: 1.2 }}>
                {attendance.total}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                👥 Total ({attendance.rate}%)
              </span>
            </div>
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

                    {result.isTable && (
                      <div style={{
                        margin: '0.8rem 0',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25), rgba(0,0,0,0.7))',
                        border: '1px solid var(--gold)',
                        color: 'var(--gold)',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}>
                        🍾 TABLE VIP : {result.tableName || 'Table Réservée'}
                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 400, marginTop: '0.2rem' }}>
                          Accompagner l&apos;invité à sa table VIP.
                        </div>
                      </div>
                    )}

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
