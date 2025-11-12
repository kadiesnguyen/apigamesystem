import { Box, Card, Grid, IconButton, Palette, Stack, Typography, useTheme } from '@mui/material';
import BankLogoAlt from 'assets/bank-logo-alt.svg';
import BankLogo from 'assets/bank-logo.svg';
import ChipCardBlack from 'assets/chip_black.png';
import ChipCardWhite from 'assets/chip_white.png';
import Image from 'components/base/Image';
import PartnerIcon from 'components/icons/partner-icons/PartnerIcon';
import PlayerIcon from 'components/icons/partner-icons/PlayerIcon';
import RequestIcon from 'components/icons/partner-icons/RequestIcon';
import { currencyFormat } from 'helpers/utils';

export interface KIPCardData {
  partnerActive: number;
  totalPlayer: number;
  requestAPI: number;
  revenue: number;
}

const KPICard = ({ partnerActive, totalPlayer, requestAPI, revenue }: KIPCardData) => {
  const dataAPI = [
    {
      type: 'Partner active',
      number: partnerActive,
      icon: <PartnerIcon width="28px" height="28px" />,
    },
    {
      type: 'Total Player / day',
      number: totalPlayer,
      icon: <PlayerIcon width="28px" height="28px" />,
    },
    {
      type: 'Total requests API',
      number: requestAPI,
      icon: <RequestIcon width="28px" height="28px" />,
    },
    {
      type: 'Revenue generated',
      number: revenue,
      icon: <PartnerIcon width="28px" height="28px" />,
    },
  ];
  return (
    <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
      {dataAPI.map((item, index) => (
        <Card
          key={index}
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            background: 'white',
            color: 'black',
            border: 1,
            borderColor: 'action.focus',
          }}
        >
          <Stack sx={{ gap: 4, px: { xs: 2.5, md: 3 }, pt: 3, pb: { xs: 2, md: 3 } }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Box
                  sx={{
                    width: '50px',
                    height: '50px',
                    background: '#F2F3F5',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    color: 'black',
                    fontSize: '16px',
                    textTransform: 'capitalize',
                    fontWeight: 550,
                    mt: '10px',
                  }}
                >
                  {item.type}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '20px',
                    fontWeight: 700,
                    mt: '10px',
                  }}
                  fontWeight={600}
                >
                  {item.number.toLocaleString()}
                </Typography>
              </div>
            </Stack>
          </Stack>
        </Card>
      ))}
    </Box>
  );
};

export default KPICard;
