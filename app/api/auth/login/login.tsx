// "use client";

// import { useSession as useNextAuthSession, signIn, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useSession } from "@/components/sessionProvider";
// import { useEffect, useState, useRef } from "react";
// import { useToast } from '@/components/ui/toast';

// export default function LoginPage() {
//     const { data: nextAuthSession, status } = useNextAuthSession();
//     const router = useRouter();
//     const { session, startSession, isLoading: sessionLoading } = useSession();
//     const [isInitializing, setIsInitializing] = useState(false);
//     const { showToast } = useToast();
//     const hasInitialized = useRef(false); // Track if we've already initialized

//     // Clear old session data when landing on login page without authentication
//     useEffect(() => {
//         if (status === 'unauthenticated' && session) {
//             // User is not authenticated but has old session data in localStorage
//             localStorage.removeItem('userSession')
//         }
//     }, [status, session])

//     // Initialize session when user logs in with Microsoft
//     useEffect(() => {
//         const initializeSession = async () => {
//             // Prevent multiple initializations
//             if (hasInitialized.current) {
//                 return;
//             }

//             // Only proceed if authenticated, have user data, no session yet, and not currently initializing
//             if (status === 'authenticated' && nextAuthSession?.user && !session && !isInitializing) {
//                 hasInitialized.current = true; // Mark as initialized
//                 setIsInitializing(true);

//                 const email = nextAuthSession.user.email;
//                 const microsoftUserId = nextAuthSession.user.microsoftUserId;

//                 try {
//                     // Fetch staff data from database by email
//                     const response = await fetch('/api/staff/get-by-email', {
//                         method: 'POST',
//                         headers: { 'Content-Type': 'application/json' },
//                         body: JSON.stringify({ email, microsoftUserId })
//                     });

//                     const data = await response.json();

//                     if (data.success && data.staff) {
//                         // Create session with staff data
//                         await startSession(data.staff, microsoftUserId!);
//                         showToast('Login successful!', 'success');

//                         // Hardcoded admin emails
//                         const ADMIN_EMAILS = [
//                             '104385730@students.swinburne.edu.my',
//                             '104401021@students.swinburne.edu.my',
//                             '104401173@students.swinburne.edu.my',
//                         ];

//                         // Redirect based on role or email
//                         const isAdmin = data.staff.role === 'admin' || ADMIN_EMAILS.includes(data.staff.email);
//                         if (isAdmin) {
//                             router.push("/admin/dashboard");
//                         } else {
//                             router.push("/user/dashboard");
//                         }
//                     } else {
//                         // Handle different error scenarios
//                         showToast(data.error || 'Login failed', 'error');
//                         hasInitialized.current = false; // Reset on error
//                         await signOut({ callbackUrl: '/' });
//                     }
//                 } catch (error) {
//                     console.error('Error:', error);
//                     showToast('An error occurred during login', 'error');
//                     hasInitialized.current = false; // Reset on error
//                     await signOut({ callbackUrl: '/' });
//                 } finally {
//                     setIsInitializing(false);
//                 }
//             }
//         };

//         initializeSession();
//     }, [status, nextAuthSession, session, isInitializing, router, showToast, startSession]);

//     // Redirect to dashboard if already authenticated with session
//     useEffect(() => {
//         if (status === 'authenticated' && session && !isInitializing) {
//             // Hardcoded admin emails
//             const ADMIN_EMAILS = [
//                 '104385730@students.swinburne.edu.my',
//                 '104401021@students.swinburne.edu.my',
//                 '104401173@students.swinburne.edu.my',
//             ];

//             // Redirect based on role or email
//             const isAdmin = session.role === 'admin' || (session.email && ADMIN_EMAILS.includes(session.email));

//             if (isAdmin) {
//                 router.replace("/admin/dashboard");
//             } else {
//                 router.replace("/user/dashboard");
//             }
//         }
//     }, [status, session, isInitializing, router]);

//     // Show loading state while session is loading or initializing
//     if (sessionLoading || isInitializing || status === 'loading') {
//         return (
//             <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
//                     <p className="text-gray-600">Loading...</p>
//                 </div>
//             </div>
//         );
//     }

//     // Don't render login form if already authenticated
//     if (status === 'authenticated' && session) {
//         return null;
//     }

//     return (
//         <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
//             <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
//                 {/* Logo and Header */}
//                 <div className="text-center mb-8">
//                     <div className="flex items-center justify-center mb-6">
//                         <img
//                             src="/logo-long-full.svg"
//                             alt="Swinburne University of Technology"
//                             className="h-15 w-auto"
//                         />
//                     </div>
//                     <h1 className="text-2xl font-semibold text-gray-900 mb-2">
//                         Asset Tracking System
//                     </h1>
//                     <p className="text-gray-600 text-sm">IT Asset Management</p>
//                 </div>

//                 {/* Microsoft Login */}
//                 <div className="space-y-6">
//                     <div className="text-center">
//                         <p className="text-sm text-gray-600 mb-4">
//                             Sign in with your organisation account
//                         </p>
//                     </div>

//                     <button
//                         onClick={() => signIn('azure-ad', { callbackUrl: '/admin/dashboard' })}
//                         className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium"
//                         disabled={sessionLoading || isInitializing}
//                     >
//                         <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
//                             <path d="M10 0H0V10H10V0Z" fill="#F25022" />
//                             <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
//                             <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
//                             <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
//                         </svg>
//                         {sessionLoading || isInitializing ? 'Loading...' : 'Sign in with Microsoft'}
//                     </button>

//                     <div className="text-center">
//                         <p className="text-xs text-gray-500">
//                             Secure authentication powered by Microsoft Azure AD
//                         </p>
//                     </div>

//                     {/* Registration Link */}
//                     <div className="mt-6 pt-6 border-t border-gray-200">
//                         <p className="text-center text-sm text-gray-600 mb-3">
//                             Don't have access yet?
//                         </p>
//                         <a
//                             href="/register"
//                             className="block w-full text-center px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
//                         >
//                             Register for Access
//                         </a>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }