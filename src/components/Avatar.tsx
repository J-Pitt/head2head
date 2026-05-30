import { avatarUrl } from '@/lib/avatars'

type Props = {
  seed: string
  size?: number
  className?: string
}

// Renders a DiceBear avatar. Plain <img> on purpose (remote SVG, CDN-cached)
// to avoid next/image remote-domain config.
export default function Avatar({ seed, size = 40, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl(seed, size * 2)}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={`avatar-img${className ? ` ${className}` : ''}`}
    />
  )
}
