import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaCertificate, FaFileAlt, FaUsers, FaChartBar, FaSpinner, FaCog } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import AdminCertificate from './AdminCertficate';
import AdminMarksheet from './AdminMarksheet';
import { certificatesApi } from '../../../api/certificatesApi';

const AdminCertificatesMarksheets = () => {
  console.log('🏗️ AdminCertificatesMarksheets component initializing...');

  // Check if certificatesApi is properly imported
  console.log('📦 certificatesApi import check:', typeof certificatesApi, certificatesApi);

  const [activeTab, setActiveTab] = useState('certificates');
  const [stats, setStats] = useState({
    certificates: { total: 0, issued: 0, draft: 0, cancelled: 0 },
    marksheets: { total: 0, published: 0, draft: 0, withheld: 0 },
    students_covered: 0,
    success_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add error boundary state
  const [hasError, setHasError] = useState(false);

  // Removed template information state - using fixed templates only

  // Load statistics from API with better error handling
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading stats...');

      let data;
      try {
        // Check if certificatesApi is available
        if (!certificatesApi || typeof certificatesApi.getStats !== 'function') {
          throw new Error('CertificatesApi not properly loaded');
        }

        data = await certificatesApi.getStats();
        console.log('📊 Stats API response:', data);

      } catch (statsError) {
        console.warn('Stats API failed, calculating from certificate data:', statsError);
        // Fallback: Calculate stats from actual certificate data
        try {
          const certificatesResponse = await certificatesApi.getCertificates();
          console.log('📋 Certificates for stats calculation:', certificatesResponse);

          const certificates = Array.isArray(certificatesResponse?.data)
            ? certificatesResponse.data
            : Array.isArray(certificatesResponse)
              ? certificatesResponse
              : [];

          console.log('📊 Processing certificates for stats:', certificates.length, 'certificates found');

          // Calculate certificate stats
          const certStats = {
            total: certificates.length,
            issued: certificates.filter(cert => cert.status === 'issued' || cert.status === 'generated').length,
            draft: certificates.filter(cert => cert.status === 'draft' || !cert.status).length,
            cancelled: certificates.filter(cert => cert.status === 'cancelled').length
          };

          console.log('📈 Calculated certificate stats:', certStats);

          // Calculate unique students
          const uniqueStudents = new Set(certificates.map(cert => cert.student_id)).size;

          data = {
            certificates: certStats,
            marksheets: { total: 0, published: 0, draft: 0, withheld: 0 }, // TODO: Add marksheet calculation
            students_covered: uniqueStudents,
            success_rate: certStats.total > 0 ? Math.round((certStats.issued / certStats.total) * 100) : 0
          };

          console.log('Calculated stats from certificate data:', data);
        } catch (fallbackError) {
          console.error('Fallback stats calculation failed:', fallbackError);
          throw fallbackError;
        }
      }

      // Ensure proper data structure with better fallbacks
      const formattedStats = {
        certificates: {
          total: Math.max(data?.certificates?.total || 0, 0),
          issued: Math.max(data?.certificates?.issued || 0, 0),
          draft: Math.max(data?.certificates?.draft || data?.certificates?.generated || 0, 0),
          cancelled: Math.max(data?.certificates?.cancelled || 0, 0)
        },
        marksheets: {
          total: Math.max(data?.marksheets?.total || 0, 0),
          published: Math.max(data?.marksheets?.published || 0, 0),
          draft: Math.max(data?.marksheets?.draft || 0, 0),
          withheld: Math.max(data?.marksheets?.withheld || 0, 0)
        },
        students_covered: Math.max(data?.students_covered || 0, 0),
        success_rate: Math.max(data?.success_rate || 0, 0)
      };

      console.log('📊 Final formatted stats:', formattedStats);
      console.log('🎯 Certificate count that will be displayed:', formattedStats.certificates.total);
      setStats(formattedStats);

    } catch (error) {
      console.error('Error loading stats:', error);
      setError(`Failed to load statistics: ${error.message}`);

      // Set default stats on error
      setStats({
        certificates: { total: 0, issued: 0, draft: 0, cancelled: 0 },
        marksheets: { total: 0, published: 0, draft: 0, withheld: 0 },
        students_covered: 0,
        success_rate: 0
      });
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since it only uses state setters

  // Removed template loading - using fixed templates only

  // Direct refresh function for manual triggers and actual data changes only
  const handleDataChange = useCallback(() => {
    console.log('Data change detected, refreshing stats');
    loadStats();
  }, [loadStats]);

  // Immediate refresh for manual button clicks
  const refreshStats = useCallback(() => {
    console.log('Manual stats refresh triggered');
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('🚀 Initializing AdminCertificatesMarksheets component');
        await loadStats();
      } catch (error) {
        console.error('❌ Failed to initialize component:', error);
        setHasError(true);
        setError('Failed to initialize the certificates and marksheets page');
      }
    };

    initializeComponent();
    // Removed template loading - using fixed templates only
  }, []); // Only run once on mount

  // Show loading state
  if (loading && !hasError) {
    return (
      <BranchLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading certificates and marksheets...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  // If there's an error, show error UI
  if (hasError) {
    return (
      <BranchLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
                window.location.reload();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Certificate & Marksheet
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Create, manage, and issue certificates and marksheets
              </p>
            </div>
            <div className="flex space-x-3 w-full md:w-auto">
              <button
                onClick={refreshStats}
                disabled={loading}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaChartBar className="w-4 h-4" />
                )}
                <span>Refresh Stats</span>
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCertificate className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Certificates</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-gray-900">{stats.certificates.total}</p>
                    <div className="flex flex-wrap gap-2 text-xs mt-1">
                      <span className="text-green-600">Generated: {stats.certificates.issued}</span>
                      <span className="text-yellow-600">Draft: {stats.certificates.draft}</span>
                      {stats.certificates.cancelled > 0 && (
                        <span className="text-red-600">Cancelled: {stats.certificates.cancelled}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaFileAlt className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Marksheets</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-gray-900">{stats.marksheets.total}</p>
                    <div className="flex flex-wrap gap-2 text-xs mt-1">
                      <span className="text-orange-600">Published: {stats.marksheets.published}</span>
                      <span className="text-yellow-600">Draft: {stats.marksheets.draft}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaUsers className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Students Covered</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-gray-900">{stats.students_covered}</p>
                    <p className="text-xs text-gray-500">Unique students</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaChartBar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-gray-900">{stats.success_rate}%</p>
                    <p className="text-xs text-orange-600">Pass percentage</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-8 min-w-max px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('certificates')}
                className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'certificates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <FaCertificate className="w-4 h-4" />
                  <span>Certificates</span>
                  <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-full text-xs">
                    {loading ? '...' : stats.certificates.total}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('marksheets')}
                className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'marksheets'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <FaFileAlt className="w-4 h-4" />
                  <span>Marksheets</span>
                  <span className="bg-purple-100 text-purple-800 py-1 px-2 rounded-full text-xs">
                    {loading ? '...' : stats.marksheets.total}
                  </span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-0">
            {activeTab === 'certificates' && (
              <div>
                <ErrorBoundary>
                  <AdminCertificate onDataChange={handleDataChange} />
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'marksheets' && (
              <div>
                <ErrorBoundary>
                  <AdminMarksheet onDataChange={handleDataChange} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>
    </BranchLayout>
  );
};

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h3>
            <p className="text-red-600 mb-4">There was an error loading this section.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminCertificatesMarksheets;