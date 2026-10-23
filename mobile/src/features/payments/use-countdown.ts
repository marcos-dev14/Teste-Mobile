import { useEffect, useState } from 'react'

/** Milissegundos até `deadline`, atualizados a cada segundo; para em 0. */
export function useCountdown(deadline: string): number {
  const target = Date.parse(deadline)
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    if (target <= Date.now()) return
    const timer = setInterval(() => {
      tick()
      if (Date.now() >= target) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [target])

  return remaining
}
