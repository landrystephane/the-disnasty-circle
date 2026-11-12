'use client'

import { useState, useEffect } from 'react'
import styles from './Countdown.module.css'

interface CountdownProps {
  targetDate: string
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const calculate = () => {
      const now = new Date().getTime()
      const target = new Date(targetDate).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!mounted) return null

  const units = [
    { label: 'Jours',    value: timeLeft.days },
    { label: 'Heures',   value: timeLeft.hours },
    { label: 'Minutes',  value: timeLeft.minutes },
    { label: 'Secondes', value: timeLeft.seconds },
  ]

  return (
    <div className={styles.countdown}>
      {units.map(({ label, value }) => (
        <div key={label} className={styles.unit}>
          <div className={styles.value}>
            {String(value).padStart(2, '0')}
          </div>
          <div className={styles.label}>{label}</div>
        </div>
      ))}
    </div>
  )
}
