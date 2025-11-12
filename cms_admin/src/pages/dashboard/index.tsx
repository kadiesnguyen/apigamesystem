import { Grid } from '@mui/material';
import WeeklyActivity from 'components/sections/dashboard/activity/WeeklyActivity';
import BalanceHistory from 'components/sections/dashboard/balance/BalanceHistory';
import MyCards from 'components/sections/dashboard/creditCards/MyCards';
import ExpenseStatistics from 'components/sections/dashboard/expense/ExpenseStatistics';
import InvoiceOverviewTable from 'components/sections/dashboard/invoice/InvoiceOverviewTable';
import MyKPICards from 'components/sections/dashboard/KPICard/MyKPICard';
import RecentTransactions from 'components/sections/dashboard/transactions/RecentTransaction';
import QuickTransfer from 'components/sections/dashboard/transfer/QuickTransfer';

const Dashboard = () => {
  return (
    <Grid container spacing={{ xs: 2.5, sm: 3 }} mb={3} mt={2}>
      {/* ------------- Card section ---------------- */}
      <Grid item xs={12} lg={6} xxl={8} zIndex={1}>
        <MyKPICards />
      </Grid>
      <Grid item xs={12} lg={6} xxl={4} zIndex={1}>
        <RecentTransactions />
      </Grid>

      {/* ------------- Chart section ---------------- */}
      <Grid item xs={12} lg={8} zIndex={1}>
        <BalanceHistory />
      </Grid>
      <Grid item xs={12} lg={4}>
        <ExpenseStatistics />
      </Grid>

      {/* ------------- Data-Grid section ---------------- */}
      <Grid item xs={12}>
        <InvoiceOverviewTable />
      </Grid>
    </Grid>
  );
};

export default Dashboard;
