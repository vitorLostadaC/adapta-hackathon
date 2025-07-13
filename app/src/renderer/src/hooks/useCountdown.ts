import { useEffect, useRef, useState } from 'react'

/**
 * useCountdown
 * ------------
 * Returns a percentage that goes from 100 → 0 within the provided duration.
 * The countdown can be paused / resumed. When it reaches 0 the optional
 * `onComplete` callback fires exactly once.
 *
 * @param duration   Total time in milliseconds for the countdown.
 * @param onComplete Callback executed when countdown finishes.
 */
export const useCountdown = (duration: number, onComplete?: () => void) => {
  const [percent, setPercent] = useState(100)
  const [paused, setPaused] = useState(false)

  // Timestamp (ms) when the countdown should end
  const endTimeRef = useRef<number>(performance.now() + duration)
  // Remaining time when we pause the timer
  const remainingRef = useRef<number>(duration)
  // Whether the completion callback has fired (avoid double-call)
  const completedRef = useRef(false)

  // Main loop – only active while not paused
  useEffect(() => {
    if (paused) return

    let frameId: number
    const tick = () => {
      const timeLeft = endTimeRef.current - performance.now()
      const newPercent = Math.max(0, (timeLeft / duration) * 100)
      setPercent(newPercent)

      if (newPercent === 0) {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [paused, duration, onComplete])

  // Helper functions
  const pause = () => {
    if (paused) return
    remainingRef.current = Math.max(0, endTimeRef.current - performance.now())
    setPaused(true)
  }

  const resume = () => {
    if (!paused) return
    endTimeRef.current = performance.now() + remainingRef.current
    setPaused(false)
  }

  return { percent, paused, pause, resume }
}
