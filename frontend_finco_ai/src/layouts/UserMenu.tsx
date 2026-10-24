import { useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/Logout'
import PaletteIcon from '@mui/icons-material/PaletteOutlined'
import AppearanceDialog from '../features/appearance/AppearanceDialog.tsx'
import { signOutUser } from '../features/auth/authService.ts'
import { useAuth } from '../features/auth/useAuth.ts'

function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

export default function UserMenu() {
  const { user } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  if (!user) return null

  const name = user.displayName || user.email || 'Account'

  return (
    <>
      <IconButton
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        size="small"
        sx={{ borderRadius: '50%' }}
      >
        <Avatar
          src={user.photoURL ?? undefined}
          alt={name}
          sx={{ width: 34, height: 34, fontSize: '0.8125rem', fontWeight: 600, bgcolor: 'brand.200', color: 'brand.900' }}
        >
          {initials(name)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled sx={{ display: 'block', opacity: '1 !important', minWidth: 220 }}>
          <Typography variant="subtitle2">{user.displayName || 'Signed in'}</Typography>
          {user.email && (
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          )}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setAppearanceOpen(true)
          }}
        >
          <ListItemIcon>
            <PaletteIcon fontSize="small" />
          </ListItemIcon>
          Appearance
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            void signOutUser()
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
      <AppearanceDialog open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </>
  )
}
