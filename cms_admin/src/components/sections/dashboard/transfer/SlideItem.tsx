import { Avatar, Stack, Typography } from '@mui/material';

interface UserCardProps {
  data: { id: number; image: string; name: string; designation: string };
  cardSize: { lg: number; md: number; sm: number };
  active: boolean;
}

const SlideItem = ({ data, cardSize, active }: UserCardProps) => {
  return (
    <Stack
      gap={0.75}
      alignItems="center"
      justifyContent="start"
      sx={{ textAlign: 'center', maxWidth: 100, cursor: 'pointer' }}
    >
      <Avatar
        src={data.image}
        variant="circular"
        sx={{
          width: { sm: cardSize.sm, md: cardSize.md, lg: cardSize.lg },
          height: { sm: cardSize.sm, md: cardSize.md, lg: cardSize.lg },
          mb: 1,
        }}
      />
      <Typography
        color="neutral.dark"
        sx={{
          fontWeight: active ? 700 : 400,
          fontSize: {
            xs: 'caption.fontSize',
            md: 'body2.fontSize',
          },
          lineHeight: {
            xs: 'caption.lineHeight',
            md: 'body2.lineHeight',
          },
        }}
      >
        {data.name}
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          fontWeight: active ? 700 : 400,
          fontSize: {
            xs: 'caption.fontSize',
            md: 'body1.fontSize',
          },
          lineHeight: {
            xs: 'caption.lineHeight',
            md: 'body.lineHeight',
          },
        }}
      >
        {data.designation}
      </Typography>
    </Stack>
  );
};

export default SlideItem;
