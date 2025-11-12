import { SvgIcon, SvgIconProps } from '@mui/material';

const DataGridArrowDownIcon = ({ ...props }: SvgIconProps) => (
  <SvgIcon sx={{ width: 20, height: 20, ...props.sx }} {...props}>
    <path
      fill="currentColor"
      d="m8.303 12.404l3.327 3.431c.213.22.527.22.74 0l6.43-6.63C19.201 8.79 18.958 8 18.43 8h-5.723z"
    />
    <path
      fill="currentColor"
      d="M11.293 8H5.57c-.528 0-.771.79-.37 1.205l2.406 2.481z"
      opacity="0.5"
    />
  </SvgIcon>
);

export default DataGridArrowDownIcon;
