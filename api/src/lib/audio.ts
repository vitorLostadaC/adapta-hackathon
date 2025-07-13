import { spawnSync } from 'child_process'
import path from 'path'

/**
 * Process an audio file with ffmpeg to change its playback speed.
 *
 * @param inputPath Path to the original audio file
 * @param speedFactor Playback speed multiplier (allowed ffmpeg range: 0.5–2.0 per filter)
 * @returns Path to the processed audio file
 * @throws Error if ffmpeg exits with non-zero status
 */
export function speedAudio(inputPath: string, speedFactor = 2): string {
  if (speedFactor <= 0) {
    throw new Error('speedFactor must be > 0')
  }

  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.parse(inputPath).name}-${speedFactor}x${path.extname(inputPath)}`
  )

  const ffmpegResult = spawnSync('ffmpeg', [
    '-i',
    inputPath,
    '-filter:a',
    `atempo=${speedFactor}`,
    '-vn',
    outputPath,
    '-y'
  ])

  if (ffmpegResult.status !== 0) {
    const stderr = ffmpegResult.stderr?.toString() || 'Unknown ffmpeg error'
    throw new Error(`ffmpeg failed: ${stderr}`)
  }

  return outputPath
}
