import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'

export default function HomeGreeting({ name }) {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const refresh = () => setHour(new Date().getHours())
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 19 ? 'Good afternoon' : 'Good evening'
  const displayName = name?.trim()
  return displayName ? t(greeting + ', {0}', displayName) : t(greeting)
}
