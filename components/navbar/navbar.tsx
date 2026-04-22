// components/navbar/navbar.tsx

/** Commented by Desmond @ 20-April-26
 * @file navbar.tsx
 * @description The top navigation bar shown on every page of the application.
 * 
 * It has
 * - The Swinburne logo
 * - A hamburger button that opens and closes the sidebar
 * - Profile avatar button that opens a dropdown menu
 * - The profile button dropdown has user name, email, links to profile page, settings and Sign Out
 * 
 * Props:
 *   sidebarOpen - whether the sidebar is currently open
 *   setSidebarOpen - function to open or close the sidebar
 */
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  UserCircleIcon,
  CogIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import LogoutButton from '../logoutButton';
import { useSession } from "next-auth/react";

// Dynamically import Sidebar with SSR disabled
const Sidebar = dynamic(() => import('./sidebar'));

// Commented by Desmond @ 21-April-26
// Props for the navbar component
// These are managed by the parent layout so that sidebar state is shared
// between the navbar (which has the hamburger icon) and the sidebar itself.
interface navbarProps {
  // Whether the sidebar is currently open
  sidebarOpen: boolean;
  // Callback to open or close the sidebar
  setSidebarOpen: (open: boolean) => void;
}

/** Commented by Desmond @ 23-Mar-26
 * Generate a fallback avatar from the user's name for whe session.user.image is null or undefined
 * Used when OAuth provider (Microsoft) has not supplied a profile picture URL
 * Produce a fallback SVG image with the user's first two initial (e.g., "LY", "WC")
 * The SVG is encoded as a data URI so it can be used directly as an <img src>
 * 
 * @param name - The user's full name from the session (e.g. "Li Yi CHUA")
 * @returns A data URI string that can be used as an img src
 * @example
 * getInitialsAvatar("Li Yi CHUA") (shows "LY")
 * getInitialsAvatar("Desmond") (shows "D")
 */
function getInitialsAvatar(name: string): string {
  const initials = name
  .split(' ') // Split the full name to a list of words - ["Li", "Yi". "CHUA"]
  .map((part) => part[0]?.toUpperCase() || '') // Takes the first letter of each word and makes it uppercase
  .slice(0, 2) // If a user has more than 2 words in their name, only take the first two initials
  .join(''); // Join the initials together to form a string

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"> ${/* Standard namespace declaration for XML and SVG files */ ''}
    <rect width="40" height="40" rx="20" fill="#DC2626" /> ${/* Draws a red square but rounds the corners by 20px */ ''}
    <text x="20" y="25" text-anchor="middle" font-family="sans-serif" 
      font-size="14" font-weight="600" fill="white">${initials} ${/* Place the initials in the center of the circle */ ''}
    </text>
    </svg>
    `.trim();

  // Encode the SVG as a data URI so it can be used as an img src without a file
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ----------------- Navbar component ----------------------
/** Commented by Desmond @ 21-April-26
 * This is the top navigation bar that shows on every authenticated pages
 * @param sidebarOpen - Checks if the sidebar is currently open
 * @param setSidebarOpen - Set the sidebar open or close it
 */
export default function Navbar({ sidebarOpen, setSidebarOpen }: navbarProps) {
  // Whether the profile dropdown menu is currently visible
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // The current URL path - used to highlight the active sidebar menu item
  const pathname = usePathname();

  // Replaces window.location.href for navigation which doesn't cause a full page reload
  const router = useRouter();
  // Next-auth session - contains user name, email, image and role
  const { data: session } = useSession();
  // dashboardPath - where the Swinburne logo links to
  // User is redirected to different dashboard pages depending on their role
  const dashboardPath = session?.user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'; // Determine dashboard path based on user role
  // Whether the viewport is currently mobile (<768px)
  const [isMobile, setIsMobile] = useState(false);
  // Stores the last known URL path
  const prevPathname = useRef(pathname);
  // A ref attached to te profile dropdown container div
  // The click-outside handler uses this to check whether a click landed
  // inside or outside the dropdown menu
  const profileDropdownRef = useRef<HTMLDivElement>(null); // Clicking outside the handler closes the profile dropdown menu

  // Derived session values
  // These fall back to safe defaults when the session is null (loading)
  // or when the OAuth provider didn't supply an optional field
  const userName = session?.user?.name ?? 'User';
  const userEmail = session?.user?.email ?? 'No email available';
  const userAvatar = session?.user?.image || getInitialsAvatar(userName); // Use profile picture if available, otherwise generate an avatar with initials


  // ---------- Detect when the viewport changes to mobile ----------
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile(); // Run once on mount
    window.addEventListener('resize', checkIsMobile);
    // Remove the event listener on unmount to prevent memory leaks
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []); // Only run on mount and unmount


  // ---------- Closes sidebar and dropdown items when route (page) changed ----------
  useEffect(() => {
    // If the user navigates to a different page
    if (pathname !== prevPathname.current) {
      if (isMobile) {
        // Close the sidebar if it's on mobile
         setSidebarOpen(false);
      }
      // Close the profile dropdown menu when navigating to a new page
      setIsProfileOpen(false);
      // Update last visited page to the current page
      prevPathname.current = pathname;
    }
  }, [pathname, isMobile, setSidebarOpen]); // Whenever these three attributes change, the function runs


  // ---------- Close profile dropdown if sidebar opens (only on mobile) ----------
  useEffect(() => {
    // If the viewport is on mobile and the sidebar opens
    if (isMobile && sidebarOpen) {
      // Close the profile dropdown menu
      setIsProfileOpen(false);
    }
  }, [sidebarOpen, isMobile]); // Only run when the sidebar is open, or the viewport is mobile


  // -------- Click-outside handler for profile dropdown ----------
  // useCallback ensures the function is not recreated on a new render
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;

    // Check if the mouse target is inside the profile dropdown menu
    const isInsideDropdown = profileDropdownRef.current?.contains(target)

    // Check if the mouse target is inside the logout confirmation modal
    const isInsidePortal = (target as HTMLElement).closest('[data-portal-root="true"')

    // When mouse down is NOT in the profile dropdown menu OR inside the logout confirmation modal
    if (!isInsideDropdown && !isInsidePortal) {
      // Close the profile dropdown menu
      setIsProfileOpen(false);
    }
  }, []); // Run this on mount and unmount

  useEffect(() => {
    // If profile dropdown is closed, don't do anything
    if (!isProfileOpen) {
      return
    }

    // If profile dropdown menu is active
    // Add the event listener for mousedown
    document.addEventListener('mousedown', handleClickOutside);
    // Remove the event listener to prevent memory leaks
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen, handleClickOutside]); // Run this when profile dropdown menu is open and clicking outside


  // ---------- Use ESCAPE key to close profile dropdown ----------
  // WAI-ARIA Authoring Practices require that any menu opened by a trigger
  // can be closed with the ESCAPE key. Without this, keyboard only users
  // cannot close the profile dropdown menu
  useEffect(() => {
    // Listen to keyboard events
    const handleEscape = (event: KeyboardEvent) => {
      // If the key pressed is ESCAPE
      if (event.key === 'Escape') {
        // Close the profile dropdown menu
        setIsProfileOpen(false);
      };
    };
    // Add the event listener
      document.addEventListener('keydown', handleEscape);
      // Remove the event listener to prevent memory leaks
      return () => {
        document.removeEventListener('keydown', handleEscape);
      }
  }, []); // Run this on mount and unmount

  // --------------- Event handlers ---------------
  // Toggle the sidebar open or close
  const handleToggleSidebar = () => {
    // ALlow sidebar to be opened when it is closed
    setSidebarOpen(!sidebarOpen);
    // On mobile, opening the sidebar will close the profile dropdown menu
    if (isMobile) { 
      setIsProfileOpen(false);
    }
  };

  // Toggle the profile dropdown menu
  const handleToggleProfile = () => {
    // Allow it to be opened when it is closed
    setIsProfileOpen(!isProfileOpen);
    // On mobile, opening the profile dropdown menu will close the sidebar
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // ------------ Render the navbar component ------------
  return (
    <> {/* Ghost tag to group multiple elements together without adding an extra <div> */}
      {/* Fixed position, glued at top edge of screen, z-50 ensure it stays on top other elements */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        {/* Left right, up down padding. But also bigger padding on larger screens, though left side is smaller */}
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          {/* Flexbox, ensure logo and buttons sit in the same vertical line, pushes logo and last item to far left and right */}
          <div className="flex items-center justify-between">
            {/* Left section */}
            {/* Flex and items-center to center logo and button vertically; Push everything to left side of navbar; If language is arabic, flip everything to rtl */}
            <div className="flex items-center justify-start rtl:justify-end">

              {/* Hamburger icon */}
              <button
                onClick={handleToggleSidebar}
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                aria-label="Toggle sidebar"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Swinburne logo */}
              <Link href={dashboardPath} className="flex ms-2 md:me-24" rel="noopener noreferrer">
                <Image src="/logo-long-full.svg" className="h-12 w-auto me-5" alt="Swinburne Logo" width={180} height={48} priority unoptimized />
              </Link>
            </div>

            {/* Right section */}
            <div className="flex items-center">
              <div className="flex items-center ms-3 relative" ref={profileDropdownRef} >
                {/* Button to toggle profile dropdown menu */}
                <button
                  onClick={handleToggleProfile}
                  type="button"
                  className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-red-400"
                  aria-expanded={isProfileOpen}
                >
                  {/* Image is using the user's profile picture or initials */}
                  <img
                    className="w-8 h-8 rounded-full"
                    src={userAvatar}
                    alt={`${userName}'s profile picture`}
                  />
                </button>

                {/* Profile dropdown */}
                <>
                  {isProfileOpen && (
                    <div className="absolute right-0 top-12 z-40 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-xl w-64 p-6"
                      role="menu"
                      aria-label="User profile menu"
                    >
                      <div className="flex items-center mb-4 space-x-3">
                        {/* User avatar */}
                        <img
                          className="w-12 h-12 rounded-full"
                          src={userAvatar}
                          alt={`${userName}'s profile picture`}
                        />
                        <div className="flex-1 min-w-0">
                          {/* User name */}
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {userName}
                          </p>
                          {/* Email */}
                          <p className="text-xs text-gray-600 truncate" title={userEmail}>
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        {/* Button to route to the profile page */}
                        <button
                          onClick={() => {
                            router.push('/profile');
                            // Close the profile dropdown menu
                            setIsProfileOpen(false);
                          }}
                          role="menuitem"
                          className={`flex items-center w-full p-3 rounded-lg ${pathname === '/profile'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          {/* Icon */}
                          <UserCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Profile
                        </button>

                        {/* Button to go to the settings page */}
                        {/* TODO: Settings page has not been implemented */}
                        <button
                          onClick={() => {
                            router.push('/settings');
                            // Close the profile dropdown menu
                            setIsProfileOpen(false);
                          }}
                          className={`flex items-center w-full p-3 rounded-lg ${pathname === '/settings'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-800 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          {/* Icon */}
                          <CogIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                          Settings
                        </button>

                        {/* Logout button which signs out the user */}
                        <LogoutButton
                          className="flex items-center w-full p-3 rounded-lg text-gray-800 hover:bg-red-50 hover:text-red-600"
                          showIcon={true}
                          text="Sign Out"
                        />
                      </div>
                    </div>
                  )}
                </>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ----------- Sidebar ------------- */}
      {/* Rendered here so that navbar controls the sidebar state using props */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* ----------- Mobile overlay ---------- */}
      {/* 
        Covers the page in a semi-transparent black overlay that covers the
        page content when sidebar is opened 
      */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 sm:hidden"
          // Clicking the area closes the sidebar
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
