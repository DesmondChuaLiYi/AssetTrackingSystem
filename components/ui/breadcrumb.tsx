'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

interface BreadcrumbItem {
  label: string
  href: string
  isClickable?: boolean
}

interface BreadcrumbProps {
  customItems?: BreadcrumbItem[]
}

export default function Breadcrumb({ customItems }: BreadcrumbProps) {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems

    const pathSegments = pathname.split('/').filter(segment => segment !== '')
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/admin/dashboard', isClickable: true }
    ]

    let currentPath = ''
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`

      // Convert segment to readable label
      let label = segment
        .split(/[-_]/) // Split on hyphens and underscores
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      // Special cases for common paths
      const labelMap: { [key: string]: string } = {
        'admin': 'Admin',
        'assetTracking': 'Asset Tracking',
        'Assets': 'Assets',
        'addStaff': 'Add Staff',
        'dashboard': 'Dashboard'
      }

      if (labelMap[segment]) {
        label = labelMap[segment]
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isClickable: false
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <nav className="flex mb-5" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbs.map((item, index) => (
          <li key={`${item.href}-${index}`} className="inline-flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1" />
            )}
            {index === 0 ? (
              <Link
                href={item.href}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-600 transition-colors"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                {item.label}
              </Link>
            ) : index === breadcrumbs.length - 1 ? (
              <span className="text-sm font-medium text-gray-500">
                {item.label}
              </span>
            ) : item.isClickable ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500 cursor-not-allowed">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}