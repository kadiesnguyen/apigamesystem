import { Breakpoint } from '@mui/material';

export type ThemeVariant = 'light' | 'dark';

export interface Config {
  navbarVerticalCollapsed: boolean;
  openNavbarDrawer: boolean;
  theme: ThemeVariant;
  drawerWidth: number;
  minimizedLayoutBreakpoint: Breakpoint;
}

export const initialConfig: Config = {
  navbarVerticalCollapsed: false,
  openNavbarDrawer: false, // for responsive
  theme: 'light',
  drawerWidth: 300,
  minimizedLayoutBreakpoint: 'md',
};
