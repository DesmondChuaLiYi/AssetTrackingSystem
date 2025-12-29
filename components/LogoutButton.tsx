'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useSession } from './sessionProvider'

interface LogoutButtonProps {
  className?: string
  showIcon?: boolean
  text?: string
}

export default function LogoutButton({
  className = '',
  showIcon = true,
  text = 'Log Out'
}: LogoutButtonProps) {
  const router = useRouter()
  const { endSession } = useSession()
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleLogout = () => {
    setShowConfirmation(true)
  }

  const confirmLogout = async () => {
    try {
      // End session in database first
      await endSession()

      // Clear localStorage manually to ensure session is removed
      localStorage.removeItem('userSession')

      // Sign out from NextAuth and redirect to login page
      await signOut({ callbackUrl: '/', redirect: true })
    } catch (error) {
      console.error('Logout failed:', error)
      // Fallback: clear storage and redirect
      localStorage.removeItem('userSession')
      router.push('/')
    }
  }

  const cancelLogout = () => {
    setShowConfirmation(false)
  }

  return (
    <>
      <button
        onClick={handleLogout}
        className={className}
      >
        {showIcon && <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />}
        {text}
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>

            <div className="flex space-x-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}