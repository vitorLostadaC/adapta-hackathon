import { ComponentProps, useEffect, useRef, useState } from 'react'

type ToastProps = ComponentProps<'div'> & {
  onComplete?: () => void
}

const duration = 5000

export const Toast = ({ children, onComplete, ...props }: ToastProps) => {
  const [percent, setPercent] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const pauseTimeRef = useRef<number>(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const step = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = isPaused ? pauseTimeRef.current : timestamp - startTimeRef.current

      const newPercent = Math.max(0, 100 - (elapsed / duration) * 100)
      setPercent(newPercent)

      if (newPercent > 0) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        onComplete?.()
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isPaused, duration, onComplete])

  const handleMouseEnter = () => {
    setIsPaused(true)
    pauseTimeRef.current = performance.now() - (startTimeRef.current ?? 0)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
    startTimeRef.current = performance.now() - pauseTimeRef.current
  }

  return (
    <div
      className="w-full rounded-md bg-gray-700 mt-6 overflow-hidden relative"
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p className="px-6 py-4">{children}</p>

      <div
        className="absolute bottom-0 h-1 bg-green-500"
        style={{
          width: `${percent}%`,
          transition: isPaused ? 'none' : 'width 0.1s linear'
        }}
      />
    </div>
  )
}
