import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { useDashboardSummary } from "../../hooks/dashboard/useDashboardSummary.ts";
import { revealSx } from "../../theme/motion.ts";
import { concentricRings } from "../../theme/patterns.ts";
import { radius } from "../../theme/tokens.ts";
import { useBrand } from "../../theme/useBrand.ts";
import IncomeExpenseChart from "./components/IncomeExpenseChart.tsx";
import KeyFigures from "./components/KeyFigures.tsx";
import MonthSelector from "./components/MonthSelector.tsx";
import { currentMonth } from "./months.ts";
import type { DashboardSummary } from "./types.ts";

function hasNoActivity(summary: DashboardSummary) {
  const zero = (value: string) => Number(value) === 0;
  return (
    zero(summary.net_worth) &&
    zero(summary.assets) &&
    summary.trend.every((p) => zero(p.income) && zero(p.expenses))
  );
}

function NoActivity() {
  const brand = useBrand();
  return (
    <Box
      sx={{
        bgcolor: "brand.200",
        ...concentricRings(brand[400], 0.6),
        border: 1,
        borderColor: "brand.300",
        borderRadius: radius.card,
        px: { xs: 3, sm: 5 },
        py: { xs: 4, sm: 6 },
      }}
    >
      <Typography
        variant="h1"
        component="h2"
        sx={{
          fontSize: { xs: "2rem", sm: "2.75rem" },
          maxWidth: "14ch",
          mb: 1.5,
        }}
      >
        No movements yet
      </Typography>
      <Typography sx={{ color: "brand.900", maxWidth: "46ch", mb: 3 }}>
        Your summary appears here once you register your first entry in the
        ledger.
      </Typography>
      <Button
        component={RouterLink}
        to="/ledger"
        variant="contained"
        size="large"
      >
        Go to Ledger
      </Button>
    </Box>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const { data, error, isPlaceholderData, refetch } =
    useDashboardSummary(month);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "flex-end" },
              ...revealSx(0),
            }}
          >
            <Box>
              <Typography variant="h2" component="h1" sx={{ mb: 0.75 }}>
                Dashboard
              </Typography>
              <Typography color="text.secondary">
                A summary of your money for the selected month.
              </Typography>
            </Box>
            <MonthSelector month={month} onChange={setMonth} />
          </Stack>

          {error ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              }
            >
              {error.messages.join(" ")}
            </Alert>
          ) : !data ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress aria-label="Loading dashboard" />
            </Box>
          ) : hasNoActivity(data) && month === currentMonth() ? (
            <Box sx={revealSx(1)}>
              <NoActivity />
            </Box>
          ) : (
            // Dim while another month loads, instead of swapping in a spinner.
            <Stack
              spacing={2}
              sx={{
                opacity: isPlaceholderData ? 0.55 : 1,
                transition: "opacity 150ms",
              }}
              aria-busy={isPlaceholderData}
            >
              <Box sx={revealSx(1)}>
                <KeyFigures summary={data} />
              </Box>
              <Box sx={revealSx(2)}>
                <IncomeExpenseChart summary={data} />
              </Box>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
