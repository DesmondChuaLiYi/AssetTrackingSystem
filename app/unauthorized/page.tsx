"use client";

import { useRouter } from "next/navigation";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <ShieldExclamationIcon className="h-20 w-20 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>

        <p className="text-gray-600 mb-2">
          You don't have permission to access this page.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          This page is restricted to administrators only.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>

          <button
            onClick={() => router.push("/user/dashboard")}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Go to Your Dashboard
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
