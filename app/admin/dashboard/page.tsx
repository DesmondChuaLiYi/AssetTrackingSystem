"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

// Import all required Heroicons
import {
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

// Sidebar items with dropdowns
const sidebarItems = [
  { name: "Dashboard", icon: Bars3Icon, href: "/dashboard" },
  {
    name: "Asset Management",
    icon: CogIcon,
    href: "/asset-management",
    dropdown: ["Assets", "Categories", "Reports"],
  },
  {
    name: "Location",
    icon: MapPinIcon,
    href: "/location",
    dropdown: ["Sites", "Rooms", "Zones"],
  },
  {
    name: "Department",
    icon: BuildingOfficeIcon,
    href: "/department",
    dropdown: ["Units", "Teams", "Budgets"],
  },
  {
    name: "Staff",
    icon: UsersIcon,
    href: "/staff",
    dropdown: ["Employees", "Roles", "Attendance"],
  },
];

const profileItems = [
  { name: "My Profile", icon: UserCircleIcon, href: "/profile" },
  { name: "Settings", icon: CogIcon, href: "/settings" },
  { name: "Log Out", icon: ArrowRightOnRectangleIcon, href: "/logout" },
];

// Define animation variants
const sidebarVariants: Variants = {
  open: { x: 0, opacity: 1, width: "16rem", transition: { duration: 0.3, ease: "easeInOut" } },
  closed: { x: -250, opacity: 0, width: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  mobileOpen: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
  mobileClosed: { y: "-100%", opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
};

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>("/dashboard");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Handle scroll to hide/show top bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY) {
        setIsTopBarVisible(false);
      } else {
        setIsTopBarVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile); // Open on desktop, closed on mobile by default
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle dropdown without navigation
  const toggleDropdown = (href: string) => {
    setActiveItem(activeItem === href ? null : href);
  };

  // Close sidebar on mobile when clicking outside
  const handleOutsideClick = (e: MouseEvent) => {
    if (isMobile && isSidebarOpen && !(e.target as HTMLElement).closest(".sidebar")) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isMobile, isSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Mobile Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className={`sidebar bg-white shadow-lg flex flex-col z-40 overflow-hidden ${
              isMobile
                ? "fixed top-0 left-0 w-full h-[calc(100%-64px)] p-4 pt-6"
                : "min-h-screen w-64 p-4"
            }`}
            variants={sidebarVariants}
            initial={isMobile ? "mobileClosed" : "closed"}
            animate={isMobile ? "mobileOpen" : "open"}
            exit={isMobile ? "mobileClosed" : "closed"}
          >
            {/* Logo and Close Button for Mobile */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
              <Image
                src="/logo-long-full.svg"
                alt="Swinburne University of Technology"
                width={180}
                height={60}
                className="object-contain"
              />
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Bar for Mobile */}
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

            {/* Sidebar Items */}
            <nav className="flex-1 space-y-2 overflow-y-auto">
              {sidebarItems.map((item) => (
                <div key={item.name}>
                  <button
                    onClick={() => toggleDropdown(item.href)}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                      activeItem === item.href
                        ? "bg-red-600 text-white shadow-md"
                        : hoveredItem === item.name
                        ? "bg-red-50 text-red-600"
                        : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.name}
                    {item.dropdown && (
                      <ChevronDownIcon
                        className={`h-5 w-5 ml-auto transition-transform duration-200 ${
                          activeItem === item.href ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                  <AnimatePresence>
                    {item.dropdown && activeItem === item.href && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="ml-8 space-y-1 mt-1 overflow-hidden"
                      >
                        {item.dropdown.map((subItem) => (
                          <a
                            key={subItem}
                            href={`${item.href}/${subItem.toLowerCase()}`}
                            className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                          >
                            {subItem}
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Separator and Bottom Items */}
            <div className="border-t border-gray-200 pt-4 space-y-2 shrink-0">
              <a
                href="/settings"
                onMouseEnter={() => setHoveredItem("Settings")}
                onMouseLeave={() => setHoveredItem(null)}
                className={`flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out ${
                  activeItem === "/settings"
                    ? "bg-red-600 text-white shadow-md"
                    : hoveredItem === "Settings"
                    ? "bg-red-50 text-red-600"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <CogIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                Settings
              </a>
              <a
                href="/logout"
                onMouseEnter={() => setHoveredItem("Log Out")}
                onMouseLeave={() => setHoveredItem(null)}
                className={`flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out ${
                  activeItem === "/logout"
                    ? "bg-red-600 text-white shadow-md"
                    : hoveredItem === "Log Out"
                    ? "bg-red-50 text-red-600"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                Log Out
              </a>
            </div>

            {/* Profile for Mobile */}
            {isMobile && (
              <div className="border-t border-gray-200 mt-4 pt-4 shrink-0">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center w-full p-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 ease-in-out"
                >
                  <UserCircleIcon className="h-5 w-5 mr-3" />
                  Profile
                  <ChevronDownIcon
                    className={`h-5 w-5 ml-auto transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="ml-8 space-y-1 mt-1 overflow-hidden"
                    >
                      {profileItems.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                        >
                          {item.name}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {/* Top Bar (Desktop only) */}
        {!isMobile && (
          <motion.div
            className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10"
            animate={{ y: isTopBarVisible ? 0 : "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-red-600 hover:text-red-800"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div className="relative flex-1 max-w-lg">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-full"
                />
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden md:inline">Bonyra Jon</span>
                <ChevronDownIcon className="h-5 w-5" />
              </button>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg"
                >
                  {profileItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center p-2 text-gray-700 hover:bg-red-100 hover:text-red-600"
                    >
                      <item.icon className="h-5 w-5 mr-2" />
                      {item.name}
                    </a>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Mobile Top Bar */}
        {isMobile && (
          <motion.div
            className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10"
            animate={{ y: isTopBarVisible ? 0 : "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-red-600 hover:text-red-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              width={120}
              height={40}
              className="object-contain"
            />
            <UserCircleIcon className="h-6 w-6 text-gray-600" /> {/* Placeholder for profile */}
          </motion.div>
        )}

        {/* Dashboard Content */}
        <main className="p-6 flex-grow">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          {/* Top row of small placeholder boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-500">
              Asset Count Placeholder
            </div>
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-500">
              Department Placeholder
            </div>
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-500">
              Staff Placeholder
            </div>
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-500">
              Location Placeholder
            </div>
          </div>
          {/* Bottom row for graph placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-500">
              Graph Placeholder 1
            </div>
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-500">
              Graph Placeholder 2
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}