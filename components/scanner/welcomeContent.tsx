// components/scanner/WelcomeContent.tsx
import { Package, Users, MapPin, Building2 } from 'lucide-react';

export default function welcomeContent({ onNavigate }: { onNavigate: (page: string) => void }) {
  const scanOptions = [
    // ------------------ Scan asset id -----------------------
    {
      title: "View & Update Asset",
      icon: Package,
      page: "asset",
      color: "from-red-600 to-red-500",
      description: "Scan asset barcode to view and update information (e.g. condition)",
    },

    // ------------------ Scan location QR -----------------------
    {
      title: "Update Assets' Location",
      icon: MapPin,
      page: "location",
      color: "from-black to-gray-800",
      description: "Scan location QR code to tag asset to location",
    },

    // ------------------ Scan staff id -----------------------
    {
      title: "Associate Asset with Staff",
      icon: Users,
      page: "staff",
      color: "from-red-700 to-red-600",
      description: "Scan staff id to tag asset to staff",
    },

    // ------------------ Scan department QR -----------------------
    {
      title: "Update Assets' Department",
      icon: Building2,
      page: "department",
      color: "from-gray-800 to-black",
      description: "Scan department QR code to tag asset to department",
    }
  ];

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Swinburne Asset Tracking System
          </h1>
          <p className="text-xl text-gray-600">
            Choose an option to fulfill your task
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {scanOptions.map((option) => (
            <button
              key={option.page}
              onClick={() => onNavigate(option.page)}
              className={`group relative bg-gradient-to-r ${option.color} text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 p-8 overflow-hidden text-left`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <option.icon className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">{option.title}</h3>
                <p className="text-white text-opacity-90">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Commented by Desmond @ 23-April-26 : Removed unnecessary action buttons */}
        {/* <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 lg:px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Select a scan type to continue
              </span>
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}