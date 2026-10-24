import Box from '@mui/material/Box'
import { useBrand } from '../theme/useBrand.ts'

/** FincoAI's mark: three concentric arcs, echoing the rings on the tinted cards. */
export default function BrandMark({ size = 24, title }: { size?: number; title?: string }) {
  const brand = useBrand()
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="24" height="24" rx="7" fill={brand[950]} />
      <g fill="none" strokeWidth={1.8} strokeLinecap="round">
        <path d="M5 19a14 14 0 0 1 14-14" stroke={brand[300]} />
        <path d="M9 19a10 10 0 0 1 10-10" stroke={brand[200]} />
        <path d="M13 19a6 6 0 0 1 6-6" stroke="#FFFFFF" />
      </g>
    </Box>
  )
}
