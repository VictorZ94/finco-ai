import { NavLink, Outlet } from 'react-router'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Toolbar from '@mui/material/Toolbar'
import ChatIcon from '@mui/icons-material/ChatOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'
import Wordmark from '../components/Wordmark.tsx'
import UserMenu from './UserMenu.tsx'

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: <ChatIcon fontSize="small" /> },
  { to: '/ledger', label: 'Ledger', icon: <ReceiptLongIcon fontSize="small" /> },
]

export default function AppLayout() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: { xs: 1.5, sm: 5 }, minHeight: { xs: 60, sm: 64 }, px: { xs: 2, sm: 3 } }}>
          <Box sx={{ flexGrow: { xs: 1, sm: 0 } }}>
            <Wordmark />
          </Box>
          {/* Plain-text tabs, as in the reference: muted when inactive, ink with an underline when active. */}
          <Box component="nav" sx={{ display: 'flex', gap: { xs: 0.5, sm: 3 }, flexGrow: { sm: 1 }, alignSelf: 'stretch' }}>
            {NAV_ITEMS.map((item) => (
              <ButtonBase
                key={item.to}
                component={NavLink}
                to={item.to}
                aria-label={item.label}
                sx={{
                  gap: 0.75,
                  px: { xs: 1, sm: 0 },
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'brand.600',
                  position: 'relative',
                  transition: 'color 150ms',
                  '&:hover': { color: 'brand.950' },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    bgcolor: 'brand.950',
                    opacity: 0,
                    transition: 'opacity 150ms',
                  },
                  '&.active': { color: 'brand.950' },
                  '&.active::after': { opacity: 1 },
                  // Icons only on phones; labels from sm up.
                  '& .nav-icon': { display: { xs: 'inline-flex', sm: 'none' } },
                }}
              >
                <Box component="span" className="nav-icon">
                  {item.icon}
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {item.label}
                </Box>
              </ButtonBase>
            ))}
          </Box>
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
