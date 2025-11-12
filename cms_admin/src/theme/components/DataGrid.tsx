import { SvgIconProps } from '@mui/material';
import { alpha, type Components, type Theme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import DataGridArrowDownIcon from 'components/icons/table-icons/DataGridArrowDownIcon';
import DataGridArrowUpIcon from 'components/icons/table-icons/DataGridArrowUpIcon';

const DataGridComponent: Components<Omit<Theme, 'components'>>['MuiDataGrid'] = {
  defaultProps: {
    columnHeaderHeight: 52,
    rowHeight: 64,
    localeText: {
      noResultsOverlayLabel: 'No Data Available',
    },
    disableColumnMenu: true,
    disableColumnSelector: true,
    disableColumnResize: true,
    slots: {
      columnSortedAscendingIcon: (props: SvgIconProps) => (
        <DataGridArrowUpIcon sx={{ color: 'text.primary' }} {...props} />
      ),
      columnSortedDescendingIcon: (props: SvgIconProps) => (
        <DataGridArrowDownIcon sx={{ color: 'text.primary' }} {...props} />
      ),
    },
  },
  styleOverrides: {
    root: ({ theme }) => ({
      '--unstable_DataGrid-radius': 0,
      '--unstable_DataGrid-headWeight': theme.typography.fontWeightMedium,
      '--DataGrid-rowBorderColor': theme.palette.divider,
      '--DataGrid-containerBackground': theme.palette.background.default,
      backgroundColor: theme.palette.background.default,
      borderWidth: 1,
      scrollbarWidth: 'thin',
      fontWeight: theme.typography.fontWeightRegular,
      '& .MuiDataGrid-filler': {
        position: 'absolute',
        top: 0,
        height: '100% !important',
        zIndex: -1,
      },
    }),

    withBorderColor: ({ theme }) => ({
      borderColor: theme.palette.primary.main,
    }),

    main: ({ theme }) => ({
      background: alpha(theme.palette.background.paper, 0.2),
      [theme.breakpoints.up('md')]: {
        background: theme.palette.common.white,
      },
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      [theme.breakpoints.up('md')]: {
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
      },
    }),
    columnSeparator: { display: 'none' },
    columnHeader: ({ theme }) => ({
      ...theme.typography.body2,
      padding: theme.spacing(0),
      fontWeight: '800 !important',
      color: theme.palette.primary.light,
      backgroundColor: theme.palette.common.white,
      [theme.breakpoints.up('md')]: {
        backgroundColor: theme.palette.common.white,
      },
      '&--sorted': { color: theme.palette.primary.dark },

      height: 'var(--DataGrid-headerHeight) !important',
      '&:focus-within': {
        outline: 'none',
      },
    }),
    columnHeaderTitleContainer: ({ theme }) => ({
      paddingLeft: theme.spacing(1.25),
      paddingRight: theme.spacing(1.25),
      [theme.breakpoints.up('md')]: {
        paddingLeft: theme.spacing(0.25),
        paddingRight: theme.spacing(0.25),
      },
    }),

    overlay: ({ theme }) => ({
      backgroundColor: alpha(theme.palette.common.black, theme.palette.action.hoverOpacity),
    }),
    sortIcon: ({ theme }) => ({
      color: theme.palette.text.secondary,
    }),
    virtualScroller: () => ({
      display: 'flex',
      flexDirection: 'column',
    }),

    cell: ({ theme }) => ({
      paddingLeft: theme.spacing(2.25),
      paddingRight: theme.spacing(2.25),
      [theme.breakpoints.up('md')]: {
        paddingLeft: theme.spacing(0.25),
        paddingRight: theme.spacing(0.25),
      },
      alignItems: 'center',
      display: 'flex',
      '&--editing': {
        boxShadow: 'none',
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
      },
      '&:focus-within': {
        outline: 'none',
      },
      '.Mui-focusVisible': {
        outline: 'none',
        // removes the outline that appears when  focusing on a cell in Material UI's DataGrid component.
      },
      color: theme.palette.neutral.dark,

      '&.MuiDataGrid-cell--withRenderer': {
        overflow: 'visible !important',
      },
      "&[data-field='id']": {
        fontWeight: 300,
        color: theme.palette.grey?.[900],
        '&:before': {
          content: "'#'",
        },
      },
    }),

    // DataGrid-Menu

    paper: ({ theme }) => ({
      boxShadow: theme.shadows[5],
      padding: 0,
    }),
    iconButtonContainer: ({ theme }) => ({
      '&:focus': {
        boxShadow: 'none !important',
      },
      '& .MuiIconButton-root': {
        border: 'none',
        padding: theme.spacing(0.25),
        marginLeft: theme.spacing(1),
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: theme.palette.background.paper,
        },
        '&:active': {
          backgroundColor: theme.palette.action.active,
        },
      },
    }),
    footerContainer: ({ theme }) => ({
      fontWeight: theme.typography.fontWeightExtraBold,
      minHeight: 'auto',
      borderTopStyle: 'hidden',
    }),
    row: ({ theme }) => ({
      boxShadow: 'none', // color for row border
      '&:hover': { backgroundColor: 'inherit' },
      borderTop: '1px solid',
      borderColor: theme.palette.neutral.light,
    }),
    selectedRowCount: { display: 'none', whiteSpace: 'nowrap' },
    columnsManagementHeader: { display: 'none', zIndex: -1 },
  },
};

export default DataGridComponent;
