import { Box, Card, Link, Stack, Typography } from '@mui/material';
import CreditCard, { CreditCardData } from 'components/sections/dashboard/creditCards/CreditCard';
import { Fragment } from 'react/jsx-runtime';
import SimpleBar from 'simplebar-react';
import KPICard from './KPICard';
import CardContainer from 'components/common/CardContainter';

/* ---------------------------- Credit Card Data----------------------------- */

const MyKPICards = () => {
  return (
    <Box sx={{ mt: '10px' }}>
      <Typography sx={{ fontSize: '20px', fontWeight: 600, height: '50px', lineHeight: '50px' }}>
        Dashboard
      </Typography>
      <KPICard partnerActive={1890} requestAPI={870} revenue={9000000} totalPlayer={100} />
      {/* </Card> */}
    </Box>
  );
};

export default MyKPICards;
