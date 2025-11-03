'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../LogoutButton';
import { useSession } from '../SessionProvider';

// Dynamically import Sidebar with SSR disabled
const Sidebar = dynamic(() => import('./sideBar'), {
  ssr: false,
});

interface NavBarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { session } = useSession();

  // Get user's initials for fallback, handling undefined values
  const getUserInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Safe getters for session data
  const userName = session?.name || 'User';
  const userEmail = session?.email || 'No email available';

  return (
    <>
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                aria-label="Toggle sidebar"
              >
                <span className="sr-only">Toggle sidebar</span>
                <Bars3Icon className="w-6 h-6" />
              </button>
              <a href="/admin/dashboard" className="flex ms-2 md:me-24">
                <img src="/logo-long-full.svg" className="h-12 me-5" alt="Swinburne Logo" />
              </a>
            </div>
            <div className="flex items-center">
              <div className="flex items-center ms-3 relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  type="button"
                  className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-red-400"
                  aria-expanded={isProfileOpen}
                >
                  <img className="w-8 h-8 rounded-full" src="https://flowbite.com/docs/images/people/profile-picture-5.jpg" alt="user photo" />
                </button>

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
                          onClick={() => { window.location.href = '/profile'; setIsProfileOpen(false); }}
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                            window.location.pathname === '/profile'
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <UserCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Profile
                        </button>
                        <button
                          onClick={() => { window.location.href = '/settings'; setIsProfileOpen(false); }}
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                            window.location.pathname === '/settings'
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <CogIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Settings
                        </button>
                        <LogoutButton
                          className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                            window.location.pathname === '/logout'
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                          }`}
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

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {sidebarOpen && (
        <div suppressHydrationWarning className="fixed inset-0 z-30 bg-black bg-opacity-50 sm:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  );
}