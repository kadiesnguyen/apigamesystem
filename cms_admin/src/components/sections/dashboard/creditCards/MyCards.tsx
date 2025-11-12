import { Link, Stack, Typography } from '@mui/material';
import CreditCard, { CreditCardData } from 'components/sections/dashboard/creditCards/CreditCard';
import { Fragment } from 'react/jsx-runtime';
import SimpleBar from 'simplebar-react';

/* ---------------------------- Credit Card Data----------------------------- */
interface CardData {
  theme: 'blue' | 'white';
  data: CreditCardData;
  id: number;
}
const cardData: CardData[] = [
  {
    id: 1,
    theme: 'blue',
    data: {
      balance: '5756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
    },
  },
  {
    id: 2,
    theme: 'white',
    data: {
      balance: '3200',
      cardHolder: 'Jane Doe',
      validThru: '01/24',
      cardNumber: '1234 **** **** 5678',
    },
  },
];

const MyCards = () => {
  return (
    <Fragment>
      <SimpleBar style={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" gap={4} sx={{ minWidth: 800 }}>
          {cardData.map((card) => (
            <CreditCard key={card.id} theme={card.theme} cardData={card.data} />
          ))}
        </Stack>
      </SimpleBar>
    </Fragment>
  );
};

export default MyCards;
