"use client"
import React from 'react'
import Dashboard from '../../../../components/navbar/navigationBar'

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, FileDown, Plus, Edit, Trash2, X } from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  category: string;
  location: string;
  stock: string;
}

const fetchData = async (page: number, limit: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const totalItems = 100;
  const startIndex = (page - 1) * limit;
  const data: Asset[] = Array.from({ length: limit }, (_, i) => ({
    id: startIndex + i + 1,
    name: `Asset ${startIndex + i + 1}`,
    category: ['Electronics', 'Clothing', 'Food', 'Books'][Math.floor(Math.random() * 4)],
    location: ['Building A', 'Building B', 'Warehouse', 'Office'][Math.floor(Math.random() * 4)],
    stock: Math.floor(Math.random() * 100).toString()
  }));
  
  return {
    data: data.filter(item => item.id <= totalItems),
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit)
  };
};

export default function DataTable() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    location: '',
    stock: ''
  });
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchData(page, limit);
      setData(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({ name: '', category: 'Electronics', location: '', stock: '' });
    setShowModal(true);
  };

  const handleEdit = (item: Asset) => {
    setModalMode('edit');
    setCurrentItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      location: item.location,
      stock: item.stock
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      // Your delete logic here
      alert('Delete functionality - ID: ' + id);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.location || !formData.stock) {
      alert('Please fill in all fields');
      return;
    }
    
    if (modalMode === 'add') {
      // Your add logic here
      alert('Add functionality with data: ' + JSON.stringify(formData));
    } else {
      // Your update logic here
      alert('Update functionality for ID: ' + currentItem?.id);
    }
    
    setShowModal(false);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Unable to open print window. Please check your popup blocker settings.');
      return;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Management - Page ${page}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Asset Management Report</h1>
            <p><strong>Page:</strong> ${page} of ${totalPages}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Assets:</strong> ${totalItems}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.location}</td>
                  <td>${item.stock}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <Dashboard />
      <div className="ml-auto w-[81%]    bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Asset Management</h1>
                  <p className="text-white text-sm mt-1">Total assets: {totalItems}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Asset
                  </button>
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-900 transition-colors font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    Print PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                          <span className="ml-2 text-gray-600">Loading data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No data available</td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && data.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === page - 2 || pageNum === page + 2) {
                        return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'add' ? 'Add New Asset' : 'Edit Asset'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter asset name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Electronics</option>
                      <option>Clothing</option>
                      <option>Food</option>
                      <option>Books</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {modalMode === 'add' ? 'Add Asset' : 'Update Asset'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 