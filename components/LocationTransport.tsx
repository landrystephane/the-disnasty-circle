'use client'

import { useState } from 'react'
import styles from './LocationTransport.module.css'

interface LocationTransportProps {
  address?: string
  venueName?: string
}

export default function LocationTransport({
  address = "20, rue de l'Avenir, 93800 Épinay-sur-Seine",
  venueName = "Lieu de la Soirée — Bal Masqué",
}: LocationTransportProps) {
  const [copied, setCopied] = useState(false)
  const [departure, setDeparture] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const encodedAddress = encodeURIComponent(address)

  // Universal navigation links
  // Google Maps directions with destination set to the venue address.
  // Leaving origin blank automatically uses the user's current GPS location on mobile & desktop!
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
  
  // Apple Maps directions
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encodedAddress}`
  
  // Citymapper (Best for Paris / Île-de-France RER, Métro, Bus, Tram)
  const citymapperUrl = `https://citymapper.com/directions?endaddress=${encodedAddress}`
  
  // Waze
  const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleSearchItinerary = (e: React.FormEvent) => {
    e.preventDefault()
    if (!departure.trim()) {
      window.open(googleMapsUrl, '_blank')
      return
    }
    const customRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(departure.trim())}&destination=${encodedAddress}&travelmode=transit`
    window.open(customRouteUrl, '_blank')
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      window.open(googleMapsUrl, '_blank')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false)
        const { latitude, longitude } = position.coords
        const routeWithCoords = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${encodedAddress}&travelmode=transit`
        window.open(routeWithCoords, '_blank')
      },
      () => {
        setGeoLoading(false)
        // If geolocation permission is denied, open standard Google Maps directions
        window.open(googleMapsUrl, '_blank')
      },
      { timeout: 7000 }
    )
  }

  return (
    <section className={styles.transportCard} id="transport-itineraire">
      <div className={styles.cardHeader}>
        <h2 className={`font-serif ${styles.cardTitle}`}>
          <span>📍</span> Accès, Plan & Itinéraire
        </h2>
        <span className={styles.regionBadge}>Île-de-France</span>
      </div>

      {/* Address Banner with Copy Button */}
      <div className={styles.addressBanner}>
        <div>
          <p className={styles.addressText}>{address}</p>
          <p className={styles.addressSub}>Salle de réception • Épinay-sur-Seine (93800)</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyBtn}
          title="Copier l'adresse complète"
        >
          {copied ? '✓ Adresse copiée !' : '📋 Copier l\'adresse'}
        </button>
      </div>

      {/* Interactive Google Map Iframe */}
      <div className={styles.mapWrapper}>
        <iframe
          title={`Plan interactif - ${address}`}
          className={styles.mapIframe}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
      </div>

      {/* Main Action Buttons */}
      <div className={styles.actionsGrid}>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.appBtn} ${styles.btnGoogleMaps}`}
        >
          <span>🗺️</span>
          <span>Google Maps</span>
        </a>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.appBtn} ${styles.btnAppleMaps}`}
        >
          <span>🍏</span>
          <span>Apple Maps</span>
        </a>
        <a
          href={citymapperUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.appBtn} ${styles.btnCitymapper}`}
        >
          <span>🚆</span>
          <span>Citymapper</span>
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.appBtn} ${styles.btnWaze}`}
        >
          <span>🚗</span>
          <span>Waze</span>
        </a>
      </div>

      {/* Interactive Transit Calculator */}
      <div className={styles.itinerarySearch}>
        <label className={styles.searchLabel}>
          Calculer le temps de trajet depuis votre position ou point de départ :
        </label>
        <form onSubmit={handleSearchItinerary} className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Ex : Gare du Nord, Châtelet, Cergy, Saint-Denis..."
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
          />
          <button type="submit" className={styles.searchSubmit}>
            Calculer mon trajet →
          </button>
          <button
            type="button"
            onClick={handleGeolocate}
            className={styles.geoBtn}
            disabled={geoLoading}
            title="Calculer automatiquement depuis ma position GPS"
          >
            {geoLoading ? '⏳ Localisation...' : '📍 Ma position'}
          </button>
        </form>
      </div>

      {/* Transit cheat sheet */}
      <div className={styles.transitGuides}>
        <p className={styles.guidesTitle}>Comment venir à la soirée ?</p>
        <div className={styles.transitGrid}>
          <div className={styles.transitItem}>
            <div className={styles.transitItemHeader}>
              <span className={styles.transitIcon}>🚆</span>
              <span className={styles.transitName}>Transilien Ligne H</span>
            </div>
            <p className={styles.transitDesc}>
              Gare d&apos;<strong>Épinay - Villetaneuse</strong> (à seulement 12 min direct de <strong>Paris Gare du Nord</strong>).
            </p>
          </div>

          <div className={styles.transitItem}>
            <div className={styles.transitItemHeader}>
              <span className={styles.transitIcon}>🚆</span>
              <span className={styles.transitName}>RER C</span>
            </div>
            <p className={styles.transitDesc}>
              Station <strong>Épinay-sur-Seine</strong> (Liaisons directes depuis Paris intra-muros).
            </p>
          </div>

          <div className={styles.transitItem}>
            <div className={styles.transitItemHeader}>
              <span className={styles.transitIcon}>🚊</span>
              <span className={styles.transitName}>Tramway T8 & T11</span>
            </div>
            <p className={styles.transitDesc}>
              Lignes de tramway rapides connectées à Saint-Denis, Porte de Paris et la couronne Nord.
            </p>
          </div>

          <div className={styles.transitItem}>
            <div className={styles.transitItemHeader}>
              <span className={styles.transitIcon}>🌙</span>
              <span className={styles.transitName}>Retour Nocturne & VTC</span>
            </div>
            <p className={styles.transitDesc}>
              Bus de nuit <strong>Noctilien N51</strong> (direct Paris Saint-Lazare) et applications VTC (Uber, Bolt) 24h/24.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
