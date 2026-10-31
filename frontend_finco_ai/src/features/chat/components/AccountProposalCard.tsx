import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckIcon from '@mui/icons-material/Check'
import { proposalOutcome } from '../cards.ts'
import type { AccountProposalCard as Card } from '../types.ts'

interface AccountProposalCardProps {
  card: Card
  isAnswering: boolean
  onAnswer: (accept: boolean) => void
}

/** "Create 5135-04 Taxi under 5135 Servicios?" with Create account / No; nothing is created without a tap. */
export default function AccountProposalCard({ card, isAnswering, onAnswer }: AccountProposalCardProps) {
  const outcome = proposalOutcome(card)
  return (
    <Box
      sx={{ mt: 1.5, p: 1.5, bgcolor: 'brand.50', border: 1, borderColor: 'brand.100', borderRadius: '16px' }}
      data-testid="account-proposal"
    >
      <Typography variant="caption" color="text.secondary">
        New account
      </Typography>
      <Typography sx={{ fontWeight: 600 }}>
        <Typography component="span" variant="money" sx={{ mr: 1, fontWeight: 600 }}>
          {card.code}
        </Typography>
        {card.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: outcome ? 0.5 : 1.5 }}>
        Under {card.parent_code} {card.parent_name}
      </Typography>
      {outcome ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          {card.status === 'accepted' && <CheckIcon fontSize="small" />}
          <Typography variant="body2">{outcome}</Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" loading={isAnswering} onClick={() => onAnswer(true)}>
            Create account
          </Button>
          <Button variant="outlined" size="small" disabled={isAnswering} onClick={() => onAnswer(false)}>
            No
          </Button>
        </Stack>
      )}
    </Box>
  )
}
