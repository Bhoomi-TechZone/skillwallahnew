import React, { useState, useEffect } from 'react';
import { FaSearch, FaDownload, FaEye, FaPrint, FaFilter, FaSpinner, FaTimes, FaCalendarAlt, FaClock } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';

const BranchAdmitCard = () => {
  // State management
  const [admitCards, setAdmitCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    studentName: '',
    registrationNo: '',
    program: '',
    status: 'all'
  });
  const [selectedCard, setSelectedCard] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  // Mock data - Admit cards posted by admin
  const mockAdmitCards = [
    {
      id: 1,
      studentName: 'ISHAN BANERJEE',
      registrationNo: 'SVGE2025225',
      program: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
      institute: 'Bright education',
      semester: 1,
      examDate: '2025-01-15',
      examTime: '10:00 AM',
      venue: 'Examination Hall - Block A',
      instructions: 'Report 30 minutes before exam time. Bring ID proof and pen.',
      status: 'approved',
      createdBy: 'Admin',
      createdAt: '2024-12-15',
      downloadUrl: '/downloads/admit-cards/ishan-banerjee.pdf'
    },
    {
      id: 2,
      studentName: 'AMIT',
      registrationNo: 'SVGE2025209',
      program: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
      institute: 'SSK ACADEMY',
      semester: 1,
      examDate: '2025-01-15',
      examTime: '10:00 AM',
      venue: 'Examination Hall - Block B',
      instructions: 'Report 30 minutes before exam time. Bring ID proof and pen.',
      status: 'approved',
      createdBy: 'Admin',
      createdAt: '2024-12-14',
      downloadUrl: '/downloads/admit-cards/amit.pdf'
    },
    {
      id: 3,
      studentName: 'Frhd',
      registrationNo: 'SVGE2025212',
      program: 'CSE',
      institute: 'Tech Institute',
      semester: 1,
      examDate: '2025-01-20',
      examTime: '2:00 PM',
      venue: 'Computer Lab - Block C',
      instructions: 'Practical exam. Bring student ID card.',
      status: 'pending',
      createdBy: 'Admin',
      createdAt: '2024-12-16',
      downloadUrl: null
    },
    {
      id: 4,
      studentName: 'Ankit',
      registrationNo: 'SVGE2025213',
      program: 'CSE',
      institute: 'Engineering College',
      semester: 1,
      examDate: '2025-01-20',
      examTime: '2:00 PM',
      venue: 'Computer Lab - Block C',
      instructions: 'Practical exam. Bring student ID card.',
      status: 'approved',
      createdBy: 'Admin',
      createdAt: '2024-12-13',
      downloadUrl: '/downloads/admit-cards/ankit.pdf'
    },
    {
      id: 5,
      studentName: 'RAHUL SHARMA',
      registrationNo: 'SVGE2025214',
      program: 'BCC (Basic Computer Course)',
      institute: 'Computer Learning Center',
      semester: 1,
      examDate: '2025-01-25',
      examTime: '11:00 AM',
      venue: 'Theory Hall - Block D',
      instructions: 'Theory exam. Calculator not allowed.',
      status: 'rejected',
      createdBy: 'Admin',
      createdAt: '2024-12-12',
      downloadUrl: null
    },
    {
      id: 6,
      studentName: 'PRIYA SINGH',
      registrationNo: 'SVGE2025215',
      program: 'DCA (Diploma in Computer Application)',
      institute: 'Advanced Computer Institute',
      semester: 2,
      examDate: '2025-02-10',
      examTime: '9:00 AM',
      venue: 'Main Examination Hall',
      instructions: 'Final semester exam. All documents required.',
      status: 'approved',
      createdBy: 'Admin',
      createdAt: '2024-12-11',
      downloadUrl: '/downloads/admit-cards/priya-singh.pdf'
    }
  ];

  // Get franchise/branch code from token
  const getBranchCode = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.franchise_code || payload.branch_code || payload.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    // Simulate API call to fetch admit cards for this branch
    const fetchAdmitCards = async () => {
      setLoading(true);
      try {
        const branchCode = getBranchCode();
        console.log('Fetching admit cards for branch:', branchCode);

        // Simulate API delay
        setTimeout(() => {
          setAdmitCards(mockAdmitCards);
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error fetching admit cards:', error);
        setLoading(false);
      }
    };

    fetchAdmitCards();
  }, []);

  // Handle search input changes
  const handleSearchChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle preview admit card
  const handlePreviewCard = (card) => {
    setSelectedCard(card);
    setIsPreviewModalOpen(true);
  };

  // Handle download admit card
  const handleDownloadCard = (card) => {
    if (card.downloadUrl) {
      // Simulate download
      console.log('Downloading admit card for:', card.studentName);
      // In real implementation, this would trigger file download
      alert(`Downloading admit card for ${card.studentName}`);
    } else {
      alert('Admit card not available for download yet.');
    }
  };

  // Handle print admit card
  const handlePrintCard = (card) => {
    if (card.status === 'approved') {
      console.log('Printing admit card for:', card.studentName);
      // Implement print functionality
      alert(`Printing admit card for ${card.studentName}`);
    } else {
      alert('Admit card must be approved before printing.');
    }
  };

  // Filter admit cards based on search criteria
  const filteredCards = admitCards.filter(card => {
    const matchesName = !searchFilters.studentName ||
      card.studentName.toLowerCase().includes(searchFilters.studentName.toLowerCase());
    const matchesRegNo = !searchFilters.registrationNo ||
      card.registrationNo.includes(searchFilters.registrationNo);
    const matchesProgram = !searchFilters.program ||
      card.program.toLowerCase().includes(searchFilters.program.toLowerCase());
    const matchesStatus = searchFilters.status === 'all' || card.status === searchFilters.status;

    return matchesName && matchesRegNo && matchesProgram && matchesStatus;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCards.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <BranchLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              🎓 Student Admit Cards
            </h1>
            <div className="text-sm text-gray-600">
              Total Cards: <span className="font-semibold text-blue-600">{filteredCards.length}</span>
            </div>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <input
                type="text"
                placeholder="Search by student name"
                value={searchFilters.studentName}
                onChange={(e) => handleSearchChange('studentName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Registration number"
                value={searchFilters.registrationNo}
                onChange={(e) => handleSearchChange('registrationNo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Search by program"
                value={searchFilters.program}
                onChange={(e) => handleSearchChange('program', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={searchFilters.status}
                onChange={(e) => handleSearchChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{admitCards.length}</div>
              <div className="text-sm text-blue-700">Total Cards</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {admitCards.filter(card => card.status === 'approved').length}
              </div>
              <div className="text-sm text-orange-700">Approved</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {admitCards.filter(card => card.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {admitCards.filter(card => card.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-700">Rejected</div>
            </div>
          </div>
        </div>

        {/* Admit Cards Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="bg-orange-700 text-white">
            <div className="grid grid-cols-9 gap-2 p-4 font-semibold text-center text-sm">
              <div>SN.</div>
              <div>Registration No.</div>
              <div>Student Details</div>
              <div>Program</div>
              <div>Semester</div>
              <div>Exam Date</div>
              <div>Exam Time</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading admit cards...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p>No admit cards found matching your search criteria.</p>
              </div>
            ) : (
              currentItems.map((card, index) => (
                <div key={card.id} className="grid grid-cols-9 gap-2 p-4 hover:bg-gray-50 items-center text-sm">
                  <div className="text-center font-medium">
                    {indexOfFirstItem + index + 1}
                  </div>
                  <div className="text-center font-mono text-blue-600 font-bold">
                    {card.registrationNo}
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600">{card.studentName}</div>
                    <div className="text-xs text-gray-500">{card.institute}</div>
                  </div>
                  <div className="text-gray-700">
                    <div className="font-medium">{card.program}</div>
                  </div>
                  <div className="text-center font-bold text-lg">{card.semester}</div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FaCalendarAlt className="text-gray-400" />
                      <span>{formatDate(card.examDate)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FaClock className="text-gray-400" />
                      <span>{card.examTime}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                      {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handlePreviewCard(card)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="Preview Admit Card"
                    >
                      <FaEye />
                    </button>
                    {card.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleDownloadCard(card)}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                          title="Download Admit Card"
                        >
                          <FaDownload />
                        </button>
                        <button
                          onClick={() => handlePrintCard(card)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                          title="Print Admit Card"
                        >
                          <FaPrint />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-4 py-2 border rounded-md ${currentPage === index + 1
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Admit Card Preview Modal */}
        {isPreviewModalOpen && selectedCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Admit Card Preview</h2>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Admit Card Template Preview */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-lg">
                <div className="text-center mb-6">
                  <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                    <h3 className="text-2xl font-bold">ADMIT CARD</h3>
                    <p className="text-sm">Examination Admission Card</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="font-semibold w-32">Name:</span>
                      <span>{selectedCard.studentName}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Reg. No.:</span>
                      <span className="font-mono">{selectedCard.registrationNo}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Program:</span>
                      <span>{selectedCard.program}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Institute:</span>
                      <span>{selectedCard.institute}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Semester:</span>
                      <span>{selectedCard.semester}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex">
                      <span className="font-semibold w-32">Exam Date:</span>
                      <span>{formatDate(selectedCard.examDate)}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Exam Time:</span>
                      <span>{selectedCard.examTime}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Venue:</span>
                      <span>{selectedCard.venue}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold w-32">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCard.status)}`}>
                        {selectedCard.status.charAt(0).toUpperCase() + selectedCard.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedCard.instructions && (
                  <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                    <h4 className="font-semibold text-yellow-800 mb-2">Instructions:</h4>
                    <p className="text-yellow-700 text-sm">{selectedCard.instructions}</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 text-center text-gray-600 text-sm">
                  <p>This is a computer-generated admit card. No signature required.</p>
                  <p>Generated on: {formatDate(selectedCard.createdAt)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedCard.status === 'approved' && (
                  <>
                    <button
                      onClick={() => {
                        handleDownloadCard(selectedCard);
                        setIsPreviewModalOpen(false);
                      }}
                      className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                      <FaDownload className="inline mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        handlePrintCard(selectedCard);
                        setIsPreviewModalOpen(false);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <FaPrint className="inline mr-2" />
                      Print
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BranchAdmitCard;