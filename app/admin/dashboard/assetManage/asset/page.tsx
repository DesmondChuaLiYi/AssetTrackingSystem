import React from 'react'

const page = () => {
  return (
    <div>
      {/* Main content */}
      <div className='flex-1 p-6 bg-gray-50 md:pl-60'>
        <p className="text font-bold">Admin Dashboard</p>

        <div className='mt-3 h-48 flex border border-gray-300 bg-white '>
          <div className='w-40 h-28 flex flex-col border border-gray-300 bg-white p-4 rounded-lg shadow-md m-4'>
            <p className='font-bold pt-1'>
              Total Assets
            </p>
            <p className='pt-1'>1688</p>
          </div>

          <div className='w-40 h-28 flex flex-col border border-gray-300 bg-white p-4 rounded-lg shadow-md m-4'>
            <p className='font-bold pt-1'>
              Current Assets
            </p>
            <p className='pt-1'>68</p>
          </div>

          <div className='w-40 h-28 flex flex-col border border-gray-300 bg-white p-4 rounded-lg shadow-md m-4'>
            <p className='font-bold pt-1'>
              Total Staff
            </p>
            <p className='pt-1'>98</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
