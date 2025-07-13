import { ComponentProps } from 'react'
import { useCountdown } from '../../hooks/useCountdown'
import { useWindowHeightSync } from '../../hooks/useWindowHeightSync'

// Duration the toast stays on screen (ms)
const DURATION = 5000

interface ToastProps extends ComponentProps<'div'> {
  onComplete?: () => void
}

export const Toast = ({ children, onComplete, ...props }: ToastProps) => {
  const { percent, paused, pause, resume } = useCountdown(DURATION, onComplete)
  const ref = useWindowHeightSync()

  return (
    <div
      ref={ref}
      className="w-full rounded-md bg-gray-700 mt-6 overflow-hidden relative"
      onMouseEnter={pause}
      onMouseLeave={resume}
      {...props}
    >
      <p className="px-6 py-4">{children}</p>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 h-1 bg-green-500"
        style={{
          width: `${percent}%`,
          transition: paused ? 'none' : 'width 0.1s linear'
        }}
      />
    </div>
  )
}
