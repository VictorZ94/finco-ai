import { Outlet } from 'react-router'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

export default function AppLayout() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <AccountBalanceWalletIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            FincoAI
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
