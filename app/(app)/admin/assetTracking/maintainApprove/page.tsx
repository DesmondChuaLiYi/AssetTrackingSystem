'use client';

import { useState, useEffect } from 'react';
import Breadcrumb from '@/components/ui/breadcrumb';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Assessment {
  id: string;
  asset_id: string;
  location_id: string;
  condition_status: string;
  maintenance_needed: boolean;
  priority: string;
  ai_response: string;
  image_url?: string | null;
  assessed_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export default function MaintenanceReviewPage() {
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [approvedAssessments, setApprovedAssessments] = useState<Assessment[]>([]);
  const [rejectedAssessments, setRejectedAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const breadcrumbItems = [
    { label: 'Home', href: '/admin/dashboard', isClickable: true },
    { label: 'Maintenance', href: '/admin/maintenance', isClickable: true },
    { label: 'Review', href: '', isClickable: false },
  ];

  useEffect(() => {
    fetchAllAssessments();
  }, []);

  const fetchAllAssessments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pendingAssessments');
      const data = await response.json();
      if (data.success) {
        const all: Assessment[] = data.assessments;
        setPendingAssessments(all.filter((a) => !a.approval_status || a.approval_status === 'pending'));
        setApprovedAssessments(all.filter((a) => a.approval_status === 'approved'));
        setRejectedAssessments(all.filter((a) => a.approval_status === 'rejected'));
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to approve this maintenance request?')) return;
    setProcessingId(assessmentId);
    try {
      const res = await fetch('/api/approveAssessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      if (res.ok) {
        setSelectedAssessment(null);
        fetchAllAssessments();
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to reject this maintenance request?')) return;
    setProcessingId(assessmentId);
    try {
      const res = await fetch('/api/rejectAssessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      if (res.ok) {
        setSelectedAssessment(null);
        fetchAllAssessments();
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReopen = async (assessmentId: string) => {
    if (!confirm('Reopen this assessment and move it back to pending?')) return;
    setProcessingId(assessmentId);
    try {
      const res = await fetch('/api/reopenAssessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      if (res.ok) fetchAllAssessments();
    } catch (error) {
      console.error('Error reopening:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Extracts up to 3 short bullet points from a long ai_response string
  const parseAiPoints = (text: string): string[] => {
    if (!text) return [];

    // Try to find lines that look like issues/problems (contain keywords)
    const issueKeywords = /rust|crack|broken|damage|wear|tear|leak|corrode|corroded|fray|frayed|deteriorat|fault|defect|issue|problem|missing|loose|bent|dent|scratch|stain|mold|mould|chip|peel/i;

    // Split by newlines, bullet points, or sentences
    const lines = text
      .split(/[\n\r]+|(?<=\.)\s+/)
      .map((l) => l.replace(/^[\s\-•*\d.]+/, '').trim())
      .filter((l) => l.length > 10 && l.length < 120);

    // Prefer lines with issue keywords
    const issueLines = lines.filter((l) => issueKeywords.test(l));
    const result = issueLines.length > 0 ? issueLines : lines;

    // Return max 3 points
    return result.slice(0, 3);
  };

  const activeList =
    activeTab === 'pending'
      ? pendingAssessments
      : activeTab === 'approved'
      ? approvedAssessments
      : rejectedAssessments;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      <main className="p-6 flex-grow ml-auto w-[81%]">
        <div className="max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <Breadcrumb customItems={breadcrumbItems} />

          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maintenance Review</h1>
              <p className="text-gray-600 mt-2">Review and approve pending asset maintenance requests</p>
            </div>
            <button
              onClick={fetchAllAssessments}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-yellow-600 text-yellow-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Pending ({pendingAssessments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'approved'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  Approved ({approvedAssessments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'rejected'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5" />
                  Rejected ({rejectedAssessments.length})
                </div>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : activeList.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No {activeTab} assessments</p>
                <p className="text-gray-400 text-sm mt-2">
                  {activeTab === 'pending'
                    ? 'All assessments have been processed'
                    : 'No records found'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Asset ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Condition
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                        Assessed At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI Response
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeList.map((assessment) => (
                      <tr
                        key={assessment.id}
                        className="hover:bg-gray-50"
                      >

                        {/* Asset ID */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {assessment.asset_id}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assessment.location_id}
                        </td>

                        {/* Condition */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            assessment.condition_status === 'Spoiled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {assessment.condition_status}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            assessment.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : assessment.priority === 'medium'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {assessment.priority.toUpperCase()}
                          </span>
                        </td>

                        {/* Assessed At */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(assessment.assessed_at)}
                        </td>

                        {/* AI Response */}
                        <td className="px-6 py-4 text-gray-700 w-80">
                          <ul className="space-y-1.5">
                            {parseAiPoints(assessment.ai_response).map((point, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700 leading-snug">{point}</span>
                              </li>
                            ))}
                            {parseAiPoints(assessment.ai_response).length === 0 && (
                              <li className="text-sm text-gray-400 italic">No details</li>
                            )}
                          </ul>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {(!assessment.approval_status || assessment.approval_status === 'pending') && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-yellow-700">
                              <ClockIcon className="h-4 w-4" />
                              Pending
                            </span>
                          )}
                          {assessment.approval_status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-green-900">
                              <CheckCircleIcon className="h-4 w-4" />
                              Approved
                            </span>
                          )}
                          {assessment.approval_status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-red-900">
                              <XCircleIcon className="h-4 w-4" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {activeTab === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedAssessment(assessment)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-xs"
                              >
                                <EyeIcon className="h-4 w-4" />
                                View
                              </button>
                              <button
                                onClick={() => handleApprove(assessment.id)}
                                disabled={processingId === assessment.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-xs disabled:bg-gray-400"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(assessment.id)}
                                disabled={processingId === assessment.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs disabled:bg-gray-400"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                          {(activeTab === 'approved' || activeTab === 'rejected') && (
                            <div className="flex gap-2">
                              {assessment.image_url && (
                                <button
                                  onClick={() => setSelectedAssessment(assessment)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-xs"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                  View
                                </button>
                              )}
                              <button
                                onClick={() => handleReopen(assessment.id)}
                                disabled={processingId === assessment.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors text-xs disabled:opacity-50"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                Reopen
                              </button>
                            </div>
                          )}
                        </td>

                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Modal - shows image + full AI response */}
      {selectedAssessment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAssessment(null)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-800">
                Asset Image — {selectedAssessment.asset_id}
              </h2>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Image */}
            {selectedAssessment.image_url ? (
              <div className="border rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={selectedAssessment.image_url}
                  alt="Asset"
                  className="w-full max-h-[50vh] object-contain"
                />
              </div>
            ) : (
              <div className="border rounded-lg bg-gray-100 h-48 flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
