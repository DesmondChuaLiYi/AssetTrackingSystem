'use client'

import { usePathname } from 'next/navigation'
import NavBar from  './navbar/navbar'
import { ReactNode, useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [desktopSidebarState, setDesktopSidebarState] = useState(true)

  // Pages where navbar/sidebar should be hidden
  const authPages = ['/', '/session/start', '/session/end', '/login', '/register']
  const isAuthPage = authPages.includes(pathname)
  const { showToast } = useToast();

  // Initialize component
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show login success toast on first dashboard visit
  useEffect(() => {
    if (!mounted) return;

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

  // Handle responsive behavior and load saved sidebar state
  useEffect(() => {
    if (!mounted) return

    const handleResize = () => {
      const mobile = window.innerWidth < 768
      const wasMobile = isMobile
      setIsMobile(mobile)

      if (!mobile && wasMobile) {
        // Transitioning from mobile to desktop - restore desktop state
        setSidebarOpen(desktopSidebarState)
      } else if (mobile && !wasMobile) {
        // Transitioning from desktop to mobile - save current state and close sidebar
        if (!wasMobile) { // Only save if we were actually on desktop before
          setDesktopSidebarState(sidebarOpen)
        }
        setSidebarOpen(false)
      } else if (!mobile) {
        // Initial load on desktop - load saved state
        const savedSidebarState = localStorage.getItem('sidebarOpen')
        const initialState = savedSidebarState ? JSON.parse(savedSidebarState) : true
        setSidebarOpen(initialState)
        setDesktopSidebarState(initialState)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted, isMobile, sidebarOpen, desktopSidebarState])

  // Save sidebar state to localStorage when it changes (desktop only)
  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open)
    if (!isMobile) {
      setDesktopSidebarState(open)
      localStorage.setItem('sidebarOpen', JSON.stringify(open))
    }
  }

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
    // For auth pages, just return children without any wrapper
    return <>{children}</>
  }

  // For all other pages, show navbar/sidebar with proper layout
  return (
    <>
      <NavBar sidebarOpen={sidebarOpen} setSidebarOpen={handleSidebarToggle} />
      <div
        className={`transition-all duration-200 ease-in-out ${isMobile
          ? 'pt-16' // Only top padding on mobile
          : sidebarOpen
            ? 'pt-16 ml-64' // Top padding + left margin for sidebar on desktop
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