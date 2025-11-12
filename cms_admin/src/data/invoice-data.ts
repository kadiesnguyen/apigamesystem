import { GridRowsProp } from '@mui/x-data-grid';

// Define the row data type
export interface RowData {
  id: number;
  description: { title: string; revenue: string };
  transactionId: string;
  type: string;
  card: string;
  date: string;
  amount: number;
}

export const invoiceRowData: GridRowsProp<RowData> = [
  {
    id: 1,
    description: { title: 'Spotify Subscription', revenue: 'down' },
    transactionId: '12548796',
    type: 'Shopping',
    card: '1234 ****',
    date: '2024-07-03T11:21:25.968Z',
    amount: 100,
  },
  {
    id: 2,
    description: { title: 'Freepik Sales', revenue: 'up' },
    transactionId: '12548790',
    type: 'Transfer',
    card: '1234 ****',
    date: '2024-07-04T11:21:25.968Z',
    amount: 200,
  },
  {
    id: 3,
    description: { title: 'Mobile Service', revenue: 'down' },
    transactionId: '12548799',
    type: 'Service',
    card: '1234 ****',
    date: '2024-07-05T11:21:25.968Z',
    amount: 300,
  },
  {
    id: 4,
    description: { title: 'Willson', revenue: 'up' },
    transactionId: '12548798',
    type: 'Transfer',
    card: '1234 ****',
    date: '2024-07-06T11:21:25.968Z',
    amount: 400,
  },
  {
    id: 5,
    description: { title: 'Emily', revenue: 'down' },
    transactionId: '12548797',
    type: 'Transfer',
    card: '1234 ****',
    date: '2024-07-07T11:21:25.968Z',
    amount: 500,
  },
  {
    id: 6,
    description: { title: 'Netflix Subscription', revenue: 'down' },
    transactionId: '12548794',
    type: 'Entertainment',
    card: '5678 ****',
    date: '2024-07-08T11:21:25.968Z',
    amount: 150,
  },
  {
    id: 7,
    description: { title: 'Amazon Purchase', revenue: 'down' },
    transactionId: '12548793',
    type: 'Shopping',
    card: '5678 ****',
    date: '2024-07-09T11:21:25.968Z',
    amount: 250,
  },
  {
    id: 8,
    description: { title: 'Paypal Transfer', revenue: 'up' },
    transactionId: '12548792',
    type: 'Transfer',
    card: '5678 ****',
    date: '2024-07-10T11:21:25.968Z',
    amount: 350,
  },
  {
    id: 9,
    description: { title: 'Electric Bill', revenue: 'down' },
    transactionId: '12548791',
    type: 'Utility',
    card: '5678 ****',
    date: '2024-07-11T11:21:25.968Z',
    amount: 450,
  },
  {
    id: 10,
    description: { title: 'Groceries', revenue: 'down' },
    transactionId: '12548789',
    type: 'Shopping',
    card: '5678 ****',
    date: '2024-07-12T11:21:25.968Z',
    amount: 550,
  },
  {
    id: 11,
    description: { title: 'Gym Membership', revenue: 'down' },
    transactionId: '12548788',
    type: 'Health',
    card: '5678 ****',
    date: '2024-07-13T11:21:25.968Z',
    amount: 650,
  },
  {
    id: 12,
    description: { title: 'Client Payment', revenue: 'up' },
    transactionId: '12548787',
    type: 'Income',
    card: '5678 ****',
    date: '2024-07-14T11:21:25.968Z',
    amount: 750,
  },
  {
    id: 13,
    description: { title: 'Insurance Payment', revenue: 'down' },
    transactionId: '12548786',
    type: 'Insurance',
    card: '5678 ****',
    date: '2024-07-15T11:21:25.968Z',
    amount: 850,
  },
  {
    id: 14,
    description: { title: 'Consulting Fee', revenue: 'up' },
    transactionId: '12548785',
    type: 'Service',
    card: '5678 ****',
    date: '2024-07-16T11:21:25.968Z',
    amount: 950,
  },
  {
    id: 15,
    description: { title: 'Dinner at Restaurant', revenue: 'down' },
    transactionId: '12548784',
    type: 'Dining',
    card: '5678 ****',
    date: '2024-07-17T11:21:25.968Z',
    amount: 1050,
  },
];
