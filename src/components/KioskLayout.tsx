import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Stack, Tooltip, ActionIcon, Box } from '@mantine/core';
import { 
  IconHome, 
  IconTrophy, 
  IconSettings,
  IconRefresh,
  IconToolsKitchen2,
  IconChecklist,
  IconRobot,
  IconCalendar,
  IconCloud,
} from '@tabler/icons-react';

interface NavItem {
  to: string;
  icon: typeof IconHome;
  label: string;
  color: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: IconRobot, label: 'Home', color: 'violet' },
  { to: '/chores', icon: IconChecklist, label: 'Chores', color: 'blue' },
  { to: '/calendar', icon: IconCalendar, label: 'Calendar', color: 'cyan' },
  { to: '/weather', icon: IconCloud, label: 'Weather', color: 'indigo' },
  { to: '/dinner', icon: IconToolsKitchen2, label: 'Dinner Plan', color: 'red' },
  { to: '/rewards', icon: IconTrophy, label: 'Rewards', color: 'yellow' },
  { to: '/admin', icon: IconSettings, label: 'Settings', color: 'gray' },
];

interface KioskLayoutProps {
  children: ReactNode;
  onRefresh?: () => void;
}

export function KioskLayout({ children, onRefresh }: KioskLayoutProps) {
  const location = useLocation();

  return (
    <Box
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 50%, #ffffff 100%)',
      }}
    >
      {/* Slim Sidebar */}
      <Box
        style={{
          width: 64,
          minWidth: 64,
          height: '100vh',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          gap: 8,
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          zIndex: 100,
        }}
      >
        {/* Nav Items */}
        <Stack gap="sm" align="center" style={{ flex: 1, paddingTop: 8 }}>
          {navItems.map(({ to, icon: Icon, label, color }) => {
            const isActive = location.pathname === to || 
              (to === '/' && location.pathname === '/kiosk');
            
            return (
              <Tooltip key={to} label={label} position="right" withArrow>
                <ActionIcon
                  component={NavLink}
                  to={to}
                  size={48}
                  radius="xl"
                  variant={isActive ? 'filled' : 'subtle'}
                  color={isActive ? color : 'gray'}
                  style={{
                    transition: 'all 0.2s ease',
                    background: isActive 
                      ? undefined 
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Icon size={24} stroke={isActive ? 2.5 : 1.5} />
                </ActionIcon>
              </Tooltip>
            );
          })}
        </Stack>

        {/* Refresh at bottom */}
        {onRefresh && (
          <Tooltip label="Refresh" position="right" withArrow>
            <ActionIcon
              size={48}
              radius="xl"
              variant="subtle"
              color="gray"
              onClick={onRefresh}
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <IconRefresh size={22} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        )}
      </Box>

      {/* Main Content */}
      <Box
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
