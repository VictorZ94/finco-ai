import { NavLink, Outlet } from 'react-router'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ChatIcon from '@mui/icons-material/ChatOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: <ChatIcon /> },
  { to: '/ledger', label: 'Ledger', icon: <ReceiptLongIcon /> },
]

export default function AppLayout() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <AccountBalanceWalletIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            FincoAI
          </Typography>
          <Box component="nav" sx={{ display: 'flex', gap: 0.5 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                startIcon={item.icon}
                sx={{
                  opacity: 0.8,
                  '&.active': { opacity: 1, bgcolor: 'rgba(255, 255, 255, 0.16)' },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
