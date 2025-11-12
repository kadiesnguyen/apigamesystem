import { Drawer, List, Toolbar } from '@mui/material';
import Logo from 'components/common/Logo';
import { menuLinks } from 'layouts/main-layout/sidebar/MenuLinks';
import MenuListItem from 'layouts/main-layout/sidebar/MenuListItem';
import SimpleBar from 'simplebar-react';

interface MobileSidebarProps {
  onDrawerClose: () => void;
  onDrawerTransitionEnd: () => void;
  mobileOpen: boolean;
  drawerWidth: number;
}
const MobileSidebar = ({
  onDrawerClose,
  onDrawerTransitionEnd,
  mobileOpen,
  drawerWidth,
}: MobileSidebarProps) => {
  return (
    <Drawer
      anchor="left"
      onTransitionEnd={onDrawerTransitionEnd}
      open={mobileOpen}
      onClose={onDrawerClose}
      variant="temporary"
      transitionDuration={200}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      PaperProps={{
        sx: {
          border: '0 !important',
          boxShadow: (theme) => theme.shadows[2],
          width: drawerWidth,
        },
      }}
      sx={{
        display: { xs: 'flex', md: 'none' },
        flexDirection: 'column',
        gap: 2,
        py: 3.5,
        overflow: 'hidden',
        width: drawerWidth,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: 100 }}>
        <Logo />
      </Toolbar>

      <SimpleBar style={{ maxHeight: 'calc(100vh - 100px)' }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuLinks.map((menu) => (
            <MenuListItem key={menu.id} menuItem={menu} onDrawerClose={onDrawerClose} />
          ))}
        </List>
      </SimpleBar>
    </Drawer>
  );
};

export default MobileSidebar;
