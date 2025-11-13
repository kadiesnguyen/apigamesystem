import { GridRowsProp } from '@mui/x-data-grid';

// Define the row data type
export interface RowPartnerData {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  username: string;
  status: string;
  date: string;
}

export const partnerRowData: GridRowsProp<RowPartnerData> = Array.from({ length: 150 }, (_, i) => {
  const id = i + 1;
  const fullName = `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}`;
  const phone = `09${Math.floor(100000000 + Math.random() * 899999999)}`;
  const email = `van${id}@example.com`;
  const username = `nguyenvan${id}`;
  const status = `active`;
  const date = new Date(
    2024,
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1,
  ).toISOString();

  return { id, fullName, phone, email, username, status, date };
});
