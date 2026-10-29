import { useCallback, useEffect, useState } from 'react'
import { describeError, getFavourites, removeFavourite, saveFavourite } from '../api/client'
import { useCustomer } from './session'

export interface Favourites {
  /** Saved device ids, newest first; null while loading and for anyone who is not a logged-in customer. */
  saved: readonly string[] | null
  toggle: (deviceId: string) => void
  error: string | null
}

interface Loaded {
  email: string
  ids: readonly string[]
}

/** The logged-in customer's saved devices. Nothing is loaded for visitors or technicians. */
export function useFavourites(): Favourites {
  const email = useCustomer()?.customer.email ?? null
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!email) return
    let active = true
    getFavourites()
      .then((rows) => {
        if (active) setLoaded({ email, ids: rows.map((row) => row.device_id) })
      })
      .catch((err) => {
        if (active) setError(describeError(err))
      })
    return () => {
      active = false
    }
  }, [email])

  // A list loaded for an earlier login is never shown to the next one.
  const saved = loaded && loaded.email === email ? loaded.ids : null

  const toggle = useCallback(
    (deviceId: string) => {
      if (!email || !saved) return
      const wasSaved = saved.includes(deviceId)
      // Shown at once; put back if the API refuses.
      setLoaded({ email, ids: wasSaved ? saved.filter((id) => id !== deviceId) : [deviceId, ...saved] })
      setError(null)
      ;(wasSaved ? removeFavourite(deviceId) : saveFavourite(deviceId)).catch((err) => {
        setLoaded({ email, ids: saved })
        setError(describeError(err))
      })
    },
    [email, saved],
  )

  return { saved, toggle, error }
}
