// components\layoutWrapper.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file layoutWrapper.tsx
 * @description This is the root layout wrapper that wraps every page in the application
 * 
 * This component sits between the root layout and every page component
 * It decides what to show around the sidebar and navbar
 * 
 * Two modes
 *   - Auth pages (/login, /register, /, /session/*) - rendered without sidebar or navbar
 *   - App pages (all other routes) - rendered in the full shell
 *     Navbar at the top, sidebar on the left (desktop) or sliding drawer (mobile), and 
 *     main content with the correct margin and padding
 * 
 * Responsibilities
 *   1. Auth page detection - hides navbar/sidebar on login/register/session pages
 *   2. Sidebar state - tracks open/closed, persists to localStorage on desktop
 *   3. Responsive layout - adjusts content margin when sidebar opens/closes
 *   4. Login success toast - shows a welcome-back toast on first dashboard visit
 *   5. Hydration safety - uses a mounted flag to prevent SSR/client HTML mismatch
 * 
 * Props
 *   children - the current page component passed in by Next.js app router layout
 */
import { usePathname } from 'next/navigation'
import NavBar from  './navbar/navbar'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '@/components/ui/toast'

// -------------------------- Export the layout wrapper component --------------------------
// The root layout wrapper rendered by the Next.js app router layout
/** @params children - the current page component passed in by Next.js app router layout */
export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { showToast } = useToast();

  // Whether the sidebar is currently open
  // On desktop: persisted to localStorage so it remembers between page loads
  // On mobile: always starts closed (resets when the user enters mobile view)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Whether the viewport is currently in mobile width (<768px)
  const [isMobile, setIsMobile] = useState(false)

  // Prevents SSR or hydration mismatches - localStorage cannot be accessed during
  // server-side rendering (where window doesn't exist on the server)
  // All browser API access is gated until mounted is true
  const [mounted, setMounted] = useState(false)

  // Remembers the sidebar's open and closed state while on desktop
  // When the user switches to mobile, this stores the desktop state so it can be restored
  // when they switch back to desktop
  const [desktopSidebarState, setDesktopSidebarState] = useState(true)

  // Pages where navbar/sidebar should be hidden
  const authPages = ['/', '/session/start', '/session/end', '/login', '/register']
  const isAuthPage = authPages.includes(pathname)

  // Mount the component
  useEffect(() => {
    setMounted(true)
  }, [])

  // ------------ Show login success toast on first dashboard visit ------------------
  useEffect(() => {
    if (!mounted) {
      return;
    }

    // Check if we just logged in (first visit to dashboard in this session)
    if (pathname.includes('/dashboard')) {
      const lastPath = sessionStorage.getItem('lastPath');

      // If last path was login or this is first visit, show toast
      if (!lastPath || lastPath.includes('/login')) {
        showToast('Login successful! Welcome back.', 'success');
      }

      // Update last path
      sessionStorage.setItem('lastPath', pathname);
    }
  }, [mounted, pathname, showToast])

  // ------------ Handle responsive behavior and load saved sidebar state ----------------
  useEffect(() => {
    if (!mounted) {
       return
    }

    const handleResize = () => {
      // Mobile is when viewport is less than the set threshold
      const mobile = window.innerWidth < 768
      // Save the current state (mobile view) to a temporary storage
      const wasMobile = isMobile
      // Set the viewport to mobile
      setIsMobile(mobile)

      // Viewport is no longer mobile and previously was on mobile
      if (!mobile && wasMobile) {
        // Transitioning from mobile to desktop - restore desktop state
        setSidebarOpen(desktopSidebarState)

      // Viewport is mobile and previously was not mobile
      } else if (mobile && !wasMobile) {
        // Transitioning from desktop to mobile - save current state and close sidebar
        if (!wasMobile) { // Only save if we were actually on desktop before
          setDesktopSidebarState(sidebarOpen)
          setSidebarOpen(false)
        }
        setSidebarOpen(false)

      // On desktop
      } else if (!mobile) {
        // Initial load on desktop - load saved state
        const savedSidebarState = localStorage.getItem('sidebarOpen')
        const initialState = savedSidebarState ? JSON.parse(savedSidebarState) : true // Open on desktop
        setSidebarOpen(initialState)
        setDesktopSidebarState(initialState)
      }
    }

    handleResize()
    // Add event listener to the window
    window.addEventListener('resize', handleResize)
    // Cleanup the event listener to prevent memory leaks
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted, isMobile, sidebarOpen, desktopSidebarState]) // Only update when these change

  // ------ Save sidebar state to localStorage when it changes (desktop only) --------
  const handleSidebarToggle = (open: boolean) => {
    // Open the sidebar
    setSidebarOpen(open)

    // If this is desktop viewport
    if (!isMobile) {
      // Open the sidebar
      setDesktopSidebarState(open)
      localStorage.setItem('sidebarOpen', JSON.stringify(open))
    }
  }

  // ------------ If the components are not loaded in, display a loading spinner ----------------
  // Return null to prevent a flash of wrong layout on all other pages
  if (!mounted) {
    // Show loading for auth pages, blank for others to prevent flash
    if (isAuthPage) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }
    return null // Prevent hydration mismatch
  }

  if (isAuthPage) {
    // For auth pages like /login or /register, just return children without sidebar or navbar
    return <>{children}</>
  }

  // --------------------- App page render : Full shell with navbar, sidebar and main content ----------------------
  // For all other pages, show navbar/sidebar with proper layout
  return (
    <>
      <NavBar sidebarOpen={sidebarOpen} setSidebarOpen={handleSidebarToggle} />
      <div
      // Commented by Desmond @ 20-April-26
      // Removed unnecessary animation in the className section
        // className={`transition-all duration-200 ease-in-out ${isMobile
        className={`${isMobile ? 'pt-16' // Only top padding on mobile
          : sidebarOpen ? 'pt-16 ml-64' // Top padding + left margin for sidebar on desktop
            : 'pt-16' // Only top padding when sidebar is closed
          }`}
      >
        <div> {/* Desmond, 1 Nov 25: This div is for the main content, can add padding here if stuff is too cramped */}
          {children}
        </div>
      </div>
    </>
  )
}