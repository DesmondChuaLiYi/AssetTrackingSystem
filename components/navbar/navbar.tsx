'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircleIcon,
  CogIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../logoutButton';
import { useSession } from "next-auth/react";

// Dynamically import Sidebar with SSR disabled
const Sidebar = dynamic(() => import('./sidebar'), { ssr: false });

interface NavBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const [isMobile, setIsMobile] = useState(false);
  const prevPathname = useRef(pathname);

  // Track mobile vs desktop
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close sidebar ONLY after navigation changes (not on first render)
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      if (isMobile) setSidebarOpen(false);
      setIsProfileOpen(false);
      prevPathname.current = pathname; // update stored path
    }
  }, [pathname, isMobile, setSidebarOpen]);

  // Close profile dropdown if sidebar opens (only on mobile)
  useEffect(() => {
    if (isMobile && sidebarOpen) setIsProfileOpen(false);
  }, [sidebarOpen, isMobile]);

  const userName = session?.user.name || 'User';
  const userEmail = session?.user.email || 'No email available';

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    if (isMobile) setIsProfileOpen(false);
  };

  const handleToggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                onClick={handleToggleSidebar}
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                aria-label="Toggle sidebar"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <a href="/admin/dashboard" className="flex ms-2 md:me-24">
                <img
                  src="/logo-long-full.svg"
                  className="h-12 w-auto me-5"
                  alt="Swinburne Logo"
                />
              </a>
            </div>

            {/* Right section */}
            <div className="flex items-center">
              <div className="flex items-center ms-3 relative">
                <button
                  onClick={handleToggleProfile}
                  type="button"
                  className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-red-400"
                  aria-expanded={isProfileOpen}
                >
                  <img
                    className="w-8 h-8 rounded-full"
                    src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
                    alt="user photo"
                  />
                </button>

                {/* Profile dropdown */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="absolute right-0 top-12 z-40 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-xl w-64 p-6"
                    >
                      <div className="flex items-center mb-4 space-x-3">
                        <img
                          className="w-12 h-12 rounded-full"
                          src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
                          alt="user avatar"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-gray-600 truncate" title={userEmail}>
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <button
                          onClick={() => {
                            window.location.href = '/profile';
                            setIsProfileOpen(false);
                          }}
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/profile'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          <UserCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            window.location.href = '/settings';
                            setIsProfileOpen(false);
                          }}
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${pathname === '/settings'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          <CogIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Settings
                        </button>

                        <LogoutButton
                          className="flex items-center w-full p-3 rounded-lg text-gray-800 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out"
                          showIcon={true}
                          text="Sign Out"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
