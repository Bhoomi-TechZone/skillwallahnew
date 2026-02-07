import { useState, useEffect } from 'react';
import { FaFileAlt, FaDownload, FaEye, FaPrint, FaEdit, FaCalendarAlt, FaBars, FaTimes } from 'react-icons/fa';
import SuperAdminSidebar from '../../SuperAdminSidebar';

const GenerateAgreement = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });

  const [franchises, setFranchises] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const [agreementData, setAgreementData] = useState({
    franchiseName: '',
    ownerName: '',
    territory: '',
    franchiseFee: '',
    revenueShare: '',
    startDate: '',
    endDate: '',
    terms: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingAgreement, setViewingAgreement] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchFranchises();
    fetchAgreements();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFranchises = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/franchises');
      if (response.ok) {
        const result = await response.json();
        setFranchises(Array.isArray(result) ? result : result.data || []);
      }
    } catch (error) {
      console.error('Error fetching franchises:', error);
    }
  };

  const fetchAgreements = async () => {
    try {
      console.log('Fetching agreements from API...');
      const response = await fetch('http://localhost:4000/api/agreements/');
      console.log('Agreements API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Agreements API result:', result);
        console.log('Result success:', result.success);
        console.log('Agreements data:', result.data);
        console.log('Agreements count:', result.count);

        // Handle both array response and object response
        let agreementsData = [];
        if (Array.isArray(result)) {
          agreementsData = result;
        } else if (result.success && Array.isArray(result.data)) {
          agreementsData = result.data;
        } else {
          console.warn('Unexpected API response format:', result);
        }

        setAgreements(agreementsData);
        console.log('Agreements state updated with', agreementsData.length, 'agreements');
      } else {
        console.error('Failed to fetch agreements, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setAgreements([]);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
      setAgreements([]);
    }
  };

  const handleFranchiseSelect = (franchiseId) => {
    const franchise = franchises.find(f => f._id === franchiseId);
    if (franchise) {
      setAgreementData({
        franchiseName: franchise.franchise_name,
        ownerName: franchise.owner?.name || '',
        territory: `${franchise.territory?.type} - ${franchise.address?.city}, ${franchise.address?.state}`,
        franchiseFee: franchise.financial?.franchise_fee || '',
        revenueShare: franchise.financial?.revenue_share_percent || '',
        startDate: '',
        endDate: '',
        terms: `This Franchise Agreement is entered into between SkillWallah EdTech and ${franchise.franchise_name}...`
      });
    }
  };

  const generateAgreement = async () => {
    // Validate required fields
    if (!agreementData.franchiseName || !agreementData.ownerName || !agreementData.startDate || !agreementData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        franchiseName: agreementData.franchiseName,
        ownerName: agreementData.ownerName,
        territory: agreementData.territory,
        franchiseFee: Number(agreementData.franchiseFee) || 0,
        revenueShare: Number(agreementData.revenueShare) || 0,
        startDate: agreementData.startDate,
        endDate: agreementData.endDate,
        terms: agreementData.terms,
        franchiseId: selectedFranchise || null
      };

      console.log('Generating agreement with payload:', payload);

      const response = await fetch('http://localhost:4000/api/agreements/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Agreement created successfully:', result);

      setGeneratedDocument({
        id: result.agreementId,
        fileName: `Franchise_Agreement_${agreementData.franchiseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        generatedAt: new Date(),
        status: 'Generated',
        agreementId: result.agreementId
      });

      // Fetch updated agreements list after successful creation
      await fetchAgreements();

      alert('Agreement generated successfully!');
    } catch (error) {
      console.error('Error generating agreement:', error);
      alert(`Error generating agreement: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // View Agreement Handler
  const viewAgreement = async (agreementId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreements/${agreementId}`);
      if (response.ok) {
        const result = await response.json();
        setViewingAgreement(result.data);
        setShowViewModal(true);
      } else {
        alert('Error loading agreement details');
      }
    } catch (error) {
      console.error('Error viewing agreement:', error);
      alert('Error loading agreement details');
    }
  };

  // Download Agreement Handler
  const downloadAgreement = async (agreementId, franchiseName) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreements/${agreementId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Agreement_${franchiseName.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Agreement downloaded successfully!');
      }
    } catch (error) {
      console.error('Error downloading agreement:', error);
      alert('Error downloading agreement');
    }
  };

  // Print Agreement Handler
  const printAgreement = (agreement) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Franchise Agreement - ${agreement.franchiseName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin: 20px 0; }
            .terms { margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FRANCHISE AGREEMENT</h1>
            <h2>${agreement.franchiseName}</h2>
          </div>
          <div class="details">
            <p><strong>Owner Name:</strong> ${agreement.ownerName}</p>
            <p><strong>Territory:</strong> ${agreement.territory}</p>
            <p><strong>Franchise Fee:</strong> ₹${Number(agreement.franchiseFee).toLocaleString()}</p>
            <p><strong>Revenue Share:</strong> ${agreement.revenueShare}%</p>
            <p><strong>Start Date:</strong> ${new Date(agreement.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(agreement.endDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${agreement.status}</p>
          </div>
          <div class="terms">
            <h3>Terms and Conditions:</h3>
            <p>${agreement.terms}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Edit Agreement Handler
  const editAgreement = async (agreement) => {
    setEditingAgreement({
      id: agreement._id,
      franchiseName: agreement.franchiseName,
      ownerName: agreement.ownerName,
      territory: agreement.territory,
      franchiseFee: agreement.franchiseFee,
      revenueShare: agreement.revenueShare,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      terms: agreement.terms
    });
    setShowEditModal(true);
  };

  // Save Edited Agreement
  const saveEditedAgreement = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreements/${editingAgreement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          franchiseName: editingAgreement.franchiseName,
          ownerName: editingAgreement.ownerName,
          territory: editingAgreement.territory,
          franchiseFee: Number(editingAgreement.franchiseFee),
          revenueShare: Number(editingAgreement.revenueShare),
          startDate: editingAgreement.startDate,
          endDate: editingAgreement.endDate,
          terms: editingAgreement.terms,
          franchiseId: null
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingAgreement(null);
        await fetchAgreements();
        alert('Agreement updated successfully!');
      }
    } catch (error) {
      console.error('Error updating agreement:', error);
      alert('Error updating agreement');
    }
  };

  // Delete Agreement Handler
  const deleteAgreement = async (agreementId, franchiseName) => {
    if (confirm(`Are you sure you want to delete the agreement for ${franchiseName}?`)) {
      try {
        const response = await fetch(`http://localhost:4000/api/agreements/${agreementId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await fetchAgreements();
          alert('Agreement deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting agreement:', error);
        alert('Error deleting agreement');
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Generate Agreement"
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-amber-200/50 shadow-sm sticky top-0 z-20">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-amber-900 hover:bg-amber-100 transition-colors mr-3"
                >
                  <FaBars className="text-xl" />
                </button>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-amber-900 leading-tight">Generate Agreement</h1>
                  <p className="text-xs sm:text-sm text-amber-700/70 hidden sm:block">Create new franchise agreements with customizable terms</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

            {/* Franchise Selection */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-amber-200/50 shadow-lg transition-all hover:shadow-xl">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FaFileAlt className="text-amber-600 text-lg" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Step 1: Select Franchise</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Choose Franchise Partner</label>
                  <select
                    value={selectedFranchise}
                    onChange={(e) => {
                      setSelectedFranchise(e.target.value);
                      handleFranchiseSelect(e.target.value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]"
                  >
                    <option value="">Search and select a franchise...</option>
                    {franchises.map(franchise => (
                      <option key={franchise._id} value={franchise._id}>
                        {franchise.franchise_name} ({franchise.owner?.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Agreement Details Form */}
            {selectedFranchise && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-amber-200/50 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FaEdit className="text-orange-600 text-lg" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Step 2: Agreement Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Franchise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agreementData.franchiseName}
                      onChange={(e) => setAgreementData({ ...agreementData, franchiseName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                      placeholder="Enter legal franchise name"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agreementData.ownerName}
                      onChange={(e) => setAgreementData({ ...agreementData, ownerName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                      placeholder="Enter full owner name"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700">Territory Coverage</label>
                    <input
                      type="text"
                      value={agreementData.territory}
                      onChange={(e) => setAgreementData({ ...agreementData, territory: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                      placeholder="e.g. City, State"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Fee (₹)</label>
                      <input
                        type="number"
                        value={agreementData.franchiseFee}
                        onChange={(e) => setAgreementData({ ...agreementData, franchiseFee: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Share (%)</label>
                      <input
                        type="number"
                        value={agreementData.revenueShare}
                        onChange={(e) => setAgreementData({ ...agreementData, revenueShare: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Agreement Duration <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={agreementData.startDate}
                          onChange={(e) => setAgreementData({ ...agreementData, startDate: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                          required
                        />
                        <span className="absolute -top-2.5 left-4 bg-white px-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">Start Date</span>
                      </div>
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={agreementData.endDate}
                          onChange={(e) => setAgreementData({ ...agreementData, endDate: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                          min={agreementData.startDate}
                          required
                        />
                        <span className="absolute -top-2.5 left-4 bg-white px-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">End Date</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Special Terms & Conditions</label>
                    <textarea
                      value={agreementData.terms}
                      onChange={(e) => setAgreementData({ ...agreementData, terms: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm resize-none"
                      placeholder="Specify customized terms, legal obligations, and operational requirements..."
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-8 pt-6 border-t border-amber-50">
                  <p className="text-sm text-amber-700 italic text-center sm:text-left">
                    Verifying all details is recommended before generation.
                  </p>
                  <button
                    onClick={generateAgreement}
                    disabled={isGenerating || !agreementData.franchiseName || !agreementData.ownerName || !agreementData.startDate || !agreementData.endDate}
                    className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 font-bold"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FaFileAlt />
                        <span>Generate Agreement</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Generated Document */}
            {generatedDocument && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-green-200 shadow-xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FaFileAlt className="text-green-600 text-lg" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Document Ready</h2>
                  </div>
                  <button
                    onClick={() => setGeneratedDocument(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 border border-green-100">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex-1 w-full space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="font-bold text-gray-900 break-all">{generatedDocument.fileName}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <p className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm">
                          <FaCalendarAlt className="mr-2 text-amber-500" />
                          {generatedDocument.generatedAt.toLocaleDateString()}
                        </p>
                        <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full uppercase tracking-widest shadow-sm">
                          {generatedDocument.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => viewAgreement(generatedDocument.agreementId)}
                        className="flex flex-col items-center justify-center p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all border border-blue-100 shadow-sm active:scale-95 group"
                        title="View Agreement"
                      >
                        <FaEye className="text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">View</span>
                      </button>
                      <button
                        onClick={() => downloadAgreement(generatedDocument.agreementId, agreementData.franchiseName)}
                        className="flex flex-col items-center justify-center p-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all border border-orange-100 shadow-sm active:scale-95 group"
                        title="Download Agreement"
                      >
                        <FaDownload className="text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Save</span>
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`http://localhost:4000/api/agreements/${generatedDocument.agreementId}`);
                          const agreement = await res.json();
                          if (agreement.data) printAgreement(agreement.data);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all border border-purple-100 shadow-sm active:scale-95 group"
                        title="Print Agreement"
                      >
                        <FaPrint className="text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Print</span>
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`http://localhost:4000/api/agreements/${generatedDocument.agreementId}`);
                          const result = await res.json();
                          if (result.data) editAgreement(result.data);
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition-all border border-amber-100 shadow-sm active:scale-95 group"
                        title="Edit Agreement"
                      >
                        <FaEdit className="text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Agreements */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-amber-200/50 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaFileAlt className="text-purple-600 text-lg" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Agreement Repository</h2>
                </div>
                <div className="flex items-center w-full sm:w-auto space-x-3">
                  <button
                    onClick={fetchAgreements}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm font-bold shadow hover:shadow-md active:scale-95"
                  >
                    Refresh List
                  </button>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-2.5 rounded-xl border border-gray-200 uppercase tracking-wider">
                    {agreements.length} Files
                  </span>
                </div>
              </div>

              {agreements.length === 0 ? (
                <div className="text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaFileAlt className="text-4xl text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No agreements generated yet</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Start by selecting a franchise above to create a new formal agreement document.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {agreements.map((agreement, index) => (
                    <div key={agreement._id || index} className="group bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="flex-1 w-full space-y-3">
                          <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                            <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-amber-900 transition-colors uppercase tracking-tight">{agreement.franchiseName}</h3>
                            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 uppercase tracking-widest sm:hidden">
                              {agreement.status || 'ACTIVE'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
                            <p className="flex items-center"><FaBars className="mr-2 text-gray-400 text-xs" /> <span className="font-semibold text-gray-800 mr-1">Owner:</span> {agreement.ownerName}</p>
                            <p className="flex items-center"><FaCalendarAlt className="mr-2 text-gray-400 text-xs" /> <span className="font-semibold text-gray-800 mr-1">Valid:</span> {new Date(agreement.startDate).toLocaleDateString()} - {new Date(agreement.endDate).toLocaleDateString()}</p>
                            <p className="flex items-center col-span-1 sm:col-span-2"><FaBars className="mr-2 text-gray-400 text-xs" /> <span className="font-semibold text-gray-800 mr-1">Territory:</span> {agreement.territory}</p>
                          </div>

                          <div className="flex items-center space-x-4 mt-3 hidden sm:flex">
                            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 uppercase tracking-widest shadow-sm">
                              {agreement.status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
                          <div className="flex flex-col sm:items-end justify-center px-4 py-2 bg-amber-50/50 rounded-xl border border-amber-100 sm:min-w-[140px]">
                            <p className="text-xl font-black text-amber-900">₹{Number(agreement.franchiseFee).toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{agreement.revenueShare}% Revenue Share</p>
                          </div>

                          <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2">
                            <button
                              onClick={() => viewAgreement(agreement._id)}
                              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 active:scale-95 flex-1 sm:flex-none sm:space-x-2"
                              title="View"
                            >
                              <FaEye className="text-lg sm:text-sm" />
                              <span className="text-[9px] sm:text-xs font-bold uppercase sm:tracking-normal tracking-tighter">View</span>
                            </button>
                            <button
                              onClick={() => downloadAgreement(agreement._id, agreement.franchiseName)}
                              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all border border-orange-100 active:scale-95 flex-1 sm:flex-none sm:space-x-2"
                              title="Download"
                            >
                              <FaDownload className="text-lg sm:text-sm" />
                              <span className="text-[9px] sm:text-xs font-bold uppercase sm:tracking-normal tracking-tighter">Save</span>
                            </button>
                            <button
                              onClick={() => printAgreement(agreement)}
                              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all border border-purple-100 active:scale-95 flex-1 sm:flex-none sm:space-x-2"
                              title="Print"
                            >
                              <FaPrint className="text-lg sm:text-sm" />
                              <span className="text-[9px] sm:text-xs font-bold uppercase sm:tracking-normal tracking-tighter">Print</span>
                            </button>
                            <button
                              onClick={() => editAgreement(agreement)}
                              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all border border-amber-100 active:scale-95 flex-1 sm:flex-none sm:space-x-2"
                              title="Edit"
                            >
                              <FaEdit className="text-lg sm:text-sm" />
                              <span className="text-[9px] sm:text-xs font-bold uppercase sm:tracking-normal tracking-tighter">Edit</span>
                            </button>
                          </div>

                          <button
                            onClick={() => deleteAgreement(agreement._id, agreement.franchiseName)}
                            className="hidden lg:flex p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                            title="Delete Permanently"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* View Agreement Modal */}
      {showViewModal && viewingAgreement && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 sm:px-8 py-5 sm:py-6 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12 blur-2xl"></div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">Agreement View</h2>
                  <p className="text-amber-100 text-xs sm:text-sm font-medium uppercase tracking-widest">{viewingAgreement.franchiseName}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white/80 hover:text-white transition-all p-3 rounded-2xl hover:bg-white/10 active:scale-90"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-8 bg-gray-50/50">
              {/* Status Badge */}
              <div className="flex justify-center -mt-12 mb-4">
                <div className="px-6 py-2.5 bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-black text-gray-800 uppercase tracking-widest">{viewingAgreement.status}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cards with glassmorphism style */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md h-full">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FaBars className="text-xl" /></div>
                    <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">Partner Information</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Franchise Holder</p>
                      <p className="text-sm sm:text-base font-bold text-gray-800">{viewingAgreement.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Assigned Territory</p>
                      <p className="text-sm sm:text-base font-bold text-gray-800">{viewingAgreement.territory}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md h-full">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaCalendarAlt className="text-xl" /></div>
                    <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">Contract Validity</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Commencement</p>
                      <p className="text-sm font-bold text-gray-800">{new Date(viewingAgreement.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Expirations</p>
                      <p className="text-sm font-bold text-gray-800">{new Date(viewingAgreement.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Total Term</p>
                      <p className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {Math.ceil((new Date(viewingAgreement.endDate) - new Date(viewingAgreement.startDate)) / (1000 * 60 * 60 * 24))} Days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md h-full md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FaDownload className="text-xl" /></div>
                    <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">Financial Overview</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Contract Value</p>
                      <p className="text-2xl sm:text-4xl font-black text-amber-600 tracking-tighter">₹{Number(viewingAgreement.franchiseFee).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Revenue Split</p>
                      <p className="text-2xl sm:text-4xl font-black text-blue-600 tracking-tighter">{viewingAgreement.revenueShare}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Area */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-50 text-gray-700 rounded-lg"><FaFileAlt className="text-xl" /></div>
                  <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">Official Terms & Conditions</h4>
                </div>
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 max-h-60 overflow-y-auto">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-serif italic text-justify">
                    {viewingAgreement.terms}
                  </p>
                </div>
              </div>

              <div className="h-4"></div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-gray-100 flex flex-wrap justify-end gap-3 shrink-0">
              <button
                onClick={() => downloadAgreement(viewingAgreement._id, viewingAgreement.franchiseName)}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all font-bold shadow-lg shadow-orange-100 active:scale-95 flex-1 sm:flex-none justify-center"
              >
                <FaDownload />
                <span className="text-sm">Download</span>
              </button>
              <button
                onClick={() => printAgreement(viewingAgreement)}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 transition-all font-bold shadow-lg shadow-purple-100 active:scale-95 flex-1 sm:flex-none justify-center"
              >
                <FaPrint />
                <span className="text-sm">Print</span>
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  editAgreement(viewingAgreement);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all font-bold shadow-lg shadow-amber-100 active:scale-95 flex-1 sm:flex-none justify-center"
              >
                <FaEdit />
                <span className="text-sm">Edit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agreement Modal */}
      {showEditModal && editingAgreement && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Revise Agreement</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 text-gray-600 transition-all active:scale-90"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Entity</label>
                  <input
                    type="text"
                    value={editingAgreement.franchiseName}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, franchiseName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Principal Contact</label>
                  <input
                    type="text"
                    value={editingAgreement.ownerName}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, ownerName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Area of Operation</label>
                  <input
                    type="text"
                    value={editingAgreement.territory}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, territory: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Fee</label>
                    <input
                      type="number"
                      value={editingAgreement.franchiseFee}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, franchiseFee: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Share %</label>
                    <input
                      type="number"
                      value={editingAgreement.revenueShare}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, revenueShare: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Effective From</label>
                  <input
                    type="date"
                    value={editingAgreement.startDate ? editingAgreement.startDate.split('T')[0] : ''}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Termination Date</label>
                  <input
                    type="date"
                    value={editingAgreement.endDate ? editingAgreement.endDate.split('T')[0] : ''}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-gray-900 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Revised Clause / Terms</label>
                <textarea
                  value={editingAgreement.terms}
                  onChange={(e) => setEditingAgreement({ ...editingAgreement, terms: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-3xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium text-gray-800 shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-8 py-3.5 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 hover:text-gray-700 transition-all font-bold active:scale-95 text-sm"
              >
                Discard
              </button>
              <button
                onClick={saveEditedAgreement}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all font-bold shadow-lg shadow-amber-100 active:scale-95 text-sm"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateAgreement;