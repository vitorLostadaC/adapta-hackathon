import { useEffect, useRef } from 'react'
import useMeasure from 'react-use-measure'

/**
 * useWindowHeightSync
 * -------------------
 * Measures the height of an element and notifies the Electron main process so
 * that the window grows/shrinks to fit the content. It calls
 * `window.api.increaseHeight(height)` once the height is known and
 * `window.api.decreaseHeight()` when the element unmounts.
 *
 * Returns the ref to attach to the element you want to measure.
 */
export const useWindowHeightSync = () => {
  const [ref, bounds] = useMeasure()
  const reportedRef = useRef(false)

  useEffect(() => {
    if (!reportedRef.current && bounds.height) {
      window.api.increaseHeight(bounds.height)
      reportedRef.current = true
    }

    return () => {
      if (reportedRef.current) {
        window.api.decreaseHeight()
      }
    }
  }, [bounds.height])

  return ref
}
