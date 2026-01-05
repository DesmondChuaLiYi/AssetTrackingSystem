'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, useDeprecatedInvertedScale } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CogIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../LogoutButton';
import { HomeIcon } from 'lucide-react';
import { useSession } from "next-auth/react";

const adminModules = [
  { name: 'Home', icon: HomeIcon, href: '/admin/dashboard' },
  {
    name: 'Asset Tracking',
    icon: ComputerDesktopIcon,
    href: '/admin/assetTracking',
    dropdown: [
      { label: 'Assets', path: 'assets' },
    ],
  },
  {
    name: 'Location',
    icon: MapPinIcon,
    href: '/admin/location',
    dropdown: [
      { label: 'Rooms', path: 'rooms' },
    ],
  },
  {
    name: 'Department',
    icon: BuildingOfficeIcon,
    href: '/admin/department',
    dropdown: [
      { label: 'Units', path: 'units' },
    ],
  },
  {
    name: 'Staff',
    icon: UsersIcon,
    href: '/admin/staff',
    dropdown: [
      { label: 'List', path: 'list' },
      { label: 'Approvals', path: 'approvals' },
      // { label: 'Roles', path: 'roles' },
    ],
  },
];

const userModules = [
  { name: 'Main Menu', icon: HomeIcon, href: '/user/dashboard' },
];

const sidebarVariants: Variants = {
  open: { x: 0, opacity: 1, width: '16rem', transition: { duration: 0.2, ease: 'easeInOut' } },
  closed: { x: -250, opacity: 0, width: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
  mobileOpen: { y: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeInOut' } },
  mobileClosed: { y: '-100%', opacity: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
};

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (value: boolean) => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const adminEmails = [
    '104385730@students.swinburne.edu.my',
    '104401021@students.swinburne.edu.my',
    '104401173@students.swinburne.edu.my',
  ];
  const userRole = session?.user.email && adminEmails.includes(session.user.email) ? 'admin' : 'user';

  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const savedActiveItem = localStorage.getItem('sidebarActiveItem');
    if (savedActiveItem) setActiveItem(savedActiveItem);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Only change sidebar state if transitioning between mobile and desktop
      if (mobile !== isMobile) {
        setIsOpen(!mobile);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsOpen, isMobile]);

  const toggleDropdown = (href: string) => {
    const newActive = activeItem === href ? null : href;
    setActiveItem(newActive);
    localStorage.setItem('sidebarActiveItem', newActive || '');
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (isMobile && isOpen && !(e.target as HTMLElement).closest('.sidebar')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isMobile && isOpen) document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobile, isOpen]);

  const renderGroup = (title: string, items: typeof adminModules) => (
    <div className="relative mb-6">
      <span className="absolute -top-2 left-4 bg-white px-2 text-gray-700 text-xs font-semibold uppercase tracking-wide z-10">
        {title}
      </span>
      <div className="bg-gray-50 shadow-sm rounded-lg p-3">
        <nav className="space-y-1">
          {items.map((item) => (
            <div key={item.name}>
              {/* NON-DROPDOWN ITEMS (Main Menu, Home) */}
              {item.dropdown ? null : (
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center w-full p-2 rounded-md transition-all duration-200 ease-in-out whitespace-nowrap ${pathname === item.href
                    ? 'bg-red-600 text-white shadow-md'
                    : hoveredItem === item.name
                      ? 'bg-red-50 text-red-600'
                      : 'text-black-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {item.name}
                </Link>
              )}

              {/* DROPDOWN ITEMS */}
              {item.dropdown && (
                <button
                  onClick={() => toggleDropdown(item.href)}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center w-full p-2 rounded-md transition-all duration-200 ease-in-out whitespace-nowrap ${pathname.startsWith(item.href)
                    ? 'bg-red-600 text-white shadow-md'
                    : hoveredItem === item.name
                      ? 'bg-red-50 text-red-600'
                      : 'text-black-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {item.name}
                  <ChevronDownIcon
                    className={`h-5 w-5 ml-auto transition-transform duration-200 ${activeItem === item.href ? 'rotate-180' : ''
                      }`}
                  />
                </button>
              )}

              {/* DROPDOWN CONTENT */}
              <AnimatePresence>
                {item.dropdown && activeItem === item.href && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="ml-8 space-y-1 mt-1"
                  >
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.path}
                        href={`${item.href}/${subItem.path}`}
                        className={`block p-2 text-sm rounded transition-all duration-200 ease-in-out ${pathname === `${item.href}/${subItem.path}`
                          ? 'text-red-600 bg-red-50 font-medium'
                          : 'text-black-600 hover:text-red-600 hover:bg-red-50'
                          }`}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`sidebar bg-white shadow-lg flex flex-col z-40 ${isMobile
            ? 'fixed top-0 left-0 w-full p-4 pt-6'
            : 'min-h-screen w-64 p-4 fixed left-0'
            }`}
          style={{ maxHeight: isMobile ? 'calc(100vh - 2rem)' : 'calc(100vh - 4rem)', overflowY: 'auto' }}
          variants={sidebarVariants}
          initial={isMobile ? 'mobileClosed' : 'closed'}
          animate={isMobile ? (isOpen ? 'mobileOpen' : 'mobileClosed') : (isOpen ? 'open' : 'closed')}
          exit={isMobile ? 'mobileClosed' : 'closed'}
        >
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
              <span className="text-xl font-bold invisible">Placeholder</span>
              {isMobile && (
                <button onClick={() => setIsOpen(false)} className="text-red-600 hover:text-red-800">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {isMobile && (
              <div className="relative mb-6">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-full"
                />
              </div>
            )}

            {/* Desmond, 1 Nov 25 : Start of adding user role-based module rendering */}
            {/* Admin sees both modules */}
            {userRole === 'admin' && (
              <>
                {renderGroup('Admin', adminModules)}
                {renderGroup('User', userModules)}
              </>
            )}

            {/* Regular users see only the User module */}
            {userRole === 'user' && renderGroup('User', userModules)}
            {/* Desmond, 1 Nov 25 : End */}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <Link
              href="/settings"
              onMouseEnter={() => setHoveredItem('Settings')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/settings'
                ? 'bg-red-600 text-white shadow-md'
                : hoveredItem === 'Settings'
                  ? 'bg-red-50 text-red-600'
                  : 'text-black-700 hover:bg-red-50 hover:text-red-600'
                }`}
            >
              <CogIcon className="h-5 w-5 mr-3 flex-shrink-0" />
              Settings
            </Link>
            <LogoutButton
              className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/logout'
                ? 'bg-red-600 text-white shadow-md'
                : hoveredItem === 'Log Out'
                  ? 'bg-red-50 text-red-600'
                  : 'text-black-700 hover:bg-red-50 hover:text-red-600'
                }`}
              showIcon={true}
              text="Sign Out"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}