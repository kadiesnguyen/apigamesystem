import {
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import StatementImage from 'assets/income-details.svg';
import LoanImage from 'assets/loan.svg';
import TransactionImage from 'assets/transaction-money.svg';
import IconifyIcon from 'components/base/IconifyIcon';
import dayjs from 'dayjs';
import { uniqueId } from 'lodash';
import { Fragment } from 'react/jsx-runtime';
import SimpleBar from 'simplebar-react';

const notifications_data = [
  {
    id: uniqueId(),
    title: 'Transaction Successful',
    description: 'You have received $500 from John Doe',
    avatar: TransactionImage,
    createdAt: dayjs().toDate(),
    isUnRead: true,
  },
  {
    id: uniqueId(),
    title: 'Low Balance Alert',
    description: 'Your account balance is below $100',
    avatar: null,
    createdAt: dayjs().subtract(2, 'hour').subtract(45, 'minute').toDate(),
    isUnRead: true,
  },
  {
    id: uniqueId(),
    title: 'New Loan Offer',
    description: 'You are eligible for a new personal loan',
    avatar: LoanImage,
    createdAt: dayjs().subtract(1, 'day').subtract(1, 'hour').toDate(),
    isUnRead: false,
  },
  {
    id: uniqueId(),
    title: 'Account Statement Ready',
    description: 'Your monthly account statement is now available',
    avatar: StatementImage,
    createdAt: dayjs().subtract(2, 'day').subtract(3, 'hour').toDate(),
    isUnRead: false,
  },
  {
    id: uniqueId(),
    title: 'Security Alert',
    description: 'Unusual login attempt detected',
    avatar: null,
    createdAt: dayjs().subtract(3, 'day').subtract(4, 'hour').toDate(),
    isUnRead: true,
  },
  {
    id: uniqueId(),
    title: 'Payment Reminder',
    description: 'Your credit card payment is due tomorrow',
    avatar: null,
    createdAt: dayjs().subtract(1, 'day').subtract(2, 'hour').toDate(),
    isUnRead: false,
  },
];
interface NotificationDropdownProps {
  onClose: () => void;
  open: null | HTMLElement;
}
const NotificationDropdown = ({ open, onClose }: NotificationDropdownProps) => {
  const totalUnreadMsg = notifications_data.filter((item) => item.isUnRead === true).length;

  return (
    <Fragment>
      <Popover
        open={Boolean(open)}
        anchorEl={open}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { mt: 1.5, ml: 0.75, width: 300, bgcolor: 'common.white', borderRadius: '3%' },
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', py: 2, px: 2.5 }}>
          <Stack gap={1} sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">All Notifications</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              You have {totalUnreadMsg} unread messages
            </Typography>
          </Stack>
        </Stack>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <List disablePadding dense>
          <SimpleBar style={{ height: '100%', maxHeight: 350 }}>
            {notifications_data.map((notification) => (
              <ListItemButton
                key={notification.id}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  mt: '1px',
                  ...(notification.isUnRead && {
                    bgcolor: 'background.paper',
                  }),
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{ bgcolor: 'action.disabledBackground', width: 35, height: 35 }}
                    src={notification.avatar || './assets/profile/image-1.png'}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      variant="button"
                      sx={{
                        textTransform: 'capitalize',
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <IconifyIcon
                        icon="flat-color-icons:clock"
                        sx={{ mr: 0.5, width: 16, height: 16 }}
                      />
                      {dayjs(notification.createdAt).format('MMM D, YYYY h:mm A')}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </SimpleBar>
        </List>
        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button fullWidth disableRipple color="primary">
            View All
          </Button>
        </Box>
      </Popover>
    </Fragment>
  );
};

export default NotificationDropdown;
