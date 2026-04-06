import { useState } from 'react'

/**
 * Avatar component — shows a profile photo if valid, otherwise falls back
 * to a gradient circle with the initial letter.
 *
 * Props:
 *  photo        – URL string (Cloudinary or other). Uses fallback if empty/broken.
 *  name         – Display name; first character used as fallback initial.
 *  size         – Tailwind sizing classes, e.g. "w-10 h-10" (default)
 *  shape        – Tailwind shape class, e.g. "rounded-full" or "rounded-2xl"
 *  gradient     – Tailwind gradient classes for the fallback bg
 *  textSize     – Tailwind text size for the initial letter
 *  className    – Extra classes applied to both variants
 */
export default function Avatar({
  photo,
  name = '?',
  size = 'w-10 h-10',
  shape = 'rounded-full',
  gradient = 'from-teal-500 to-cyan-600',
  textSize = 'text-sm',
  className = '',
}) {
  const [broken, setBroken] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() || '?'

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${size} ${shape} object-cover flex-shrink-0 ${className}`}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div
      className={`${size} ${shape} bg-gradient-to-br ${gradient}
        flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <span className={`text-white font-bold ${textSize}`}>{initial}</span>
    </div>
  )
}
