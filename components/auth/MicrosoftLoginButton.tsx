'use client'

import { useMsal } from '@azure/msal-react'
import { loginRequest } from '@/lib/msalConfig'

export default function MicrosoftLoginButton() {
  const { instance } = useMsal()

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
    >
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 21 21"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="12" y="1" width="9" height="9" fill="#00a4ef" />
        <rect x="1" y="12" width="9" height="9" fill="#ffb900" />
        <rect x="12" y="12" width="9" height="9" fill="#7fba00" />
      </svg>
      Sign in with Microsoft
    </button>
  )
}