import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckIcon from '@mui/icons-material/Check'
import { PRESETS, contrastReport, scaleFromSeed } from '../../theme/palette.ts'
import { useThemeColor } from '../../theme/themeColorContext.ts'
import { radius } from '../../theme/tokens.ts'

// The presets never change: build their scales once, not on every render.
const PRESET_SCALES = new Map(PRESETS.map((preset) => [preset.id, scaleFromSeed(preset.seed)]))

interface AppearanceDialogProps {
  open: boolean
  onClose: () => void
}

/** Lets the user pick the app's brand color; every option is contrast-checked. */
export default function AppearanceDialog({ open, onClose }: AppearanceDialogProps) {
  const { seed, setSeed, saveError } = useThemeColor()
  const report = contrastReport(scaleFromSeed(seed))
  const activePreset = PRESETS.find((preset) => preset.seed.toUpperCase() === seed)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h3" component="span">
          Appearance
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Choose the color of your workspace. Every option is adjusted to keep text readable.
        </Typography>

        <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
          Color
        </Typography>
        <Box
          role="radiogroup"
          aria-label="App color"
          sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(8, 1fr)' }, gap: 1.5, mb: 2 }}
        >
          {PRESETS.map((preset) => {
            const scale = PRESET_SCALES.get(preset.id)!
            const selected = activePreset?.id === preset.id
            return (
              <Stack key={preset.id} spacing={0.75} sx={{ alignItems: 'center' }}>
                <ButtonBase
                  role="radio"
                  aria-checked={selected}
                  aria-label={preset.name}
                  onClick={() => setSeed(preset.seed)}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    // Three steps of the generated scale, so the swatch shows the whole range.
                    background: `conic-gradient(${scale[200]} 0 33%, ${scale[500]} 0 66%, ${scale[900]} 0)`,
                    outline: selected ? `2px solid ${scale[950]}` : 'none',
                    outlineOffset: 3,
                    color: '#FFFFFF',
                  }}
                >
                  {selected && <CheckIcon fontSize="small" sx={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,.4))' }} />}
                </ButtonBase>
                <Typography variant="caption" color={selected ? 'text.primary' : 'text.secondary'}>
                  {preset.name}
                </Typography>
              </Stack>
            )
          })}
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
          <Box
            component="label"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.5,
              py: 1,
              border: 1,
              borderColor: activePreset ? 'brand.200' : 'brand.950',
              borderRadius: radius.control,
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}
          >
            <Box
              component="input"
              type="color"
              value={seed.toLowerCase()}
              onChange={(event) => setSeed((event.target as HTMLInputElement).value)}
              aria-label="Custom color"
              sx={{ width: 28, height: 28, p: 0, border: 0, borderRadius: '50%', cursor: 'pointer', bgcolor: 'transparent' }}
            />
            Custom color
          </Box>
          {!activePreset && (
            <Typography variant="money" color="text.secondary">
              {seed}
            </Typography>
          )}
        </Stack>

        {/* Live preview: the app already uses the chosen color; this shows the key pieces together. */}
        <Box sx={{ border: 1, borderColor: 'brand.100', borderRadius: radius.card, p: 2.5, bgcolor: 'brand.50' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Preview
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5, mb: 2 }}>
            <Button variant="contained">Save entry</Button>
            <Chip icon={<CheckIcon />} label="Balanced" />
            <Typography color="text.secondary" variant="body2">
              Secondary text
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'brand.950', pt: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>Total</Typography>
            <Typography variant="money" sx={{ fontWeight: 600 }}>
              $ 50.000
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mt: 2 }} aria-label="Contrast ratios">
          {report.map((rule) => (
            <Typography key={rule.id} variant="caption" color="text.secondary">
              {rule.label}{' '}
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.primary', fontWeight: 500 }}>
                {rule.ratio.toFixed(1)}:1
              </Box>
            </Typography>
          ))}
        </Stack>

        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
