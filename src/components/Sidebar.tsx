// src/components/Sidebar.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface Cinema {
  id: number;
  name: string;
}

interface NavLink {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: { path: string; label: string }[];
}

type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return 'items' in item;
}

interface SidebarProps {
  currentCinema?: Cinema | null;
  cinemas?: Cinema[];
  username?: string;
  onCinemaChange?: (cinemaId: number) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// SVG Icons
const HomeIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 10.5L10 4l7 6.5V17a1 1 0 01-1 1h-4v-5H8v5H4a1 1 0 01-1-1v-6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EngagementsIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 8h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ScreensIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="3" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BillingIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="4" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 8h14M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ConcessionsIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M6 3v2M14 3v2M6 17v-2M14 17v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="4" y="5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const IntegrationsIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.05 5.05l1.41 1.41M13.54 13.54l1.41 1.41M5.05 14.95l1.41-1.41M13.54 6.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const EmbedsIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M7 6l-4 4 4 4M13 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg className={styles.sidebarIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronIcon = ({ open }: { open?: boolean }) => (
  <svg className={`${styles.sidebarGroupArrow} ${open ? styles.rotated : ''}`} width="12" height="12" viewBox="0 0 12 12">
    <path d="M3 5l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5"/>
  </svg>
);

export default function Sidebar({
  currentCinema,
  cinemas = [],
  username,
  onCinemaChange,
  onLogout,
  isOpen,
  onClose,
}: SidebarProps) {
  const [isCinemaDropdownOpen, setIsCinemaDropdownOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();

  // Paths are relative since we use basename="/dashboard" in BrowserRouter
  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

  const isGroupActive = (items: { path: string; label: string }[]) =>
    items.some(item => isActive(item.path));

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Auto-expand groups with active items
  const isGroupExpanded = (label: string, items: { path: string; label: string }[]) => {
    if (expandedGroups[label] !== undefined) return expandedGroups[label];
    return isGroupActive(items);
  };

  // Paths are relative to /dashboard (the router basename)
  const navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: <HomeIcon /> },
    { path: '/engagements', label: 'Engagements', icon: <EngagementsIcon /> },
    { path: '/screens', label: 'Screens', icon: <ScreensIcon /> },
    {
      label: 'Billing',
      icon: <BillingIcon />,
      items: [
        { path: '/tickets', label: 'Ticket Types' },
        { path: '/sales-taxes', label: 'Sales Taxes' },
      ],
    },
    {
      label: 'Concessions',
      icon: <ConcessionsIcon />,
      items: [
        { path: '/concessions', label: 'Items' },
        { path: '/modifiers', label: 'Modifiers' },
      ],
    },
    { path: '/integrations', label: 'Integrations', icon: <IntegrationsIcon /> },
    { path: '/embeds', label: 'Embeds', icon: <EmbedsIcon /> },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Sidebar Overlay (mobile) */}
      {isOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.sidebarBrand}>
          <Link to="/" className={styles.sidebarLogo} onClick={handleLinkClick}>
            LeprinceOS
          </Link>
        </div>

        {/* Cinema Selector */}
        {currentCinema && cinemas.length > 1 && (
          <div className={styles.sidebarCinemaSelector}>
            <button
              className={styles.cinemaSelectorToggle}
              onClick={() => setIsCinemaDropdownOpen(!isCinemaDropdownOpen)}
            >
              <span className={styles.cinemaName}>{currentCinema.name}</span>
              <ChevronIcon open={isCinemaDropdownOpen} />
            </button>
            {isCinemaDropdownOpen && (
              <div className={styles.cinemaSelectorMenu}>
                {cinemas.map((cinema) => (
                  <button
                    key={cinema.id}
                    className={`${styles.cinemaSelectorItem} ${cinema.id === currentCinema.id ? styles.active : ''}`}
                    onClick={() => {
                      onCinemaChange?.(cinema.id);
                      setIsCinemaDropdownOpen(false);
                    }}
                  >
                    {cinema.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {navItems.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className={styles.sidebarGroup}>
                <button
                  className={`${styles.sidebarGroupToggle} ${isGroupActive(item.items) ? styles.active : ''}`}
                  onClick={() => toggleGroup(item.label)}
                >
                  {item.icon}
                  <span className={styles.sidebarGroupLabel}>{item.label}</span>
                  <ChevronIcon open={isGroupExpanded(item.label, item.items)} />
                </button>
                {isGroupExpanded(item.label, item.items) && (
                  <div className={styles.sidebarGroupItems}>
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={`${styles.sidebarSublink} ${isActive(subItem.path) ? styles.active : ''}`}
                        onClick={handleLinkClick}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.sidebarLink} ${isActive(item.path) ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* User Section */}
        <div className={styles.sidebarUser}>
          <div className={styles.sidebarUserInfo}>
            <span className={styles.sidebarUsername}>{username}</span>
          </div>
          <button className={styles.sidebarLogout} onClick={onLogout}>
            <LogoutIcon />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
