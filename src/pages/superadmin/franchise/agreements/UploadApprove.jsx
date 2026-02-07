import { useState, useEffect } from 'react';
import { 
  FaUpload, FaCheckCircle, FaTimesCircle, FaEye, 
  FaDownload, FaTrash, FaClipboardList, FaBars, FaTimes 
} from 'react-icons/fa';
import SuperAdminSidebar from '../../SuperAdminSidebar';

const UploadApprove = () => {
  // Sidebar state logic
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  
  // Data states
  const [uploadedAgreements, setUploadedAgreements] = useState([]);
  const [franchises, setFranchises] = useState([]);
  
  // Form states
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // UI states
  const [filter, setFilter] = useState('All');
  const [viewingAgreement, setViewingAgreement] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Handle window resize for sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    fetchFranchises();
    fetchUploadedAgreements();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- API Handlers (Backend remains untouched) ---

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

  const fetchUploadedAgreements = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/agreement-uploads/');
      if (response.ok) {
        const result = await response.json();
        setUploadedAgreements(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Please select a PDF or Word document');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedFranchiseId) {
      alert('Please select a file and choose a franchise');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('franchiseId', selectedFranchiseId);

      const response = await fetch('http://localhost:4000/api/agreement-uploads/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await fetchUploadedAgreements();
        setSelectedFile(null);
        setSelectedFranchiseId('');
        alert('Agreement uploaded successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const updateStatus = async (id, status, reason = '') => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-uploads/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });

      if (response.ok) {
        await fetchUploadedAgreements();
        alert(`Agreement ${status.toLowerCase()} successfully!`);
      }
    } catch (error) {
      alert('Error updating agreement status');
    }
  };

  const deleteAgreement = async (id) => {
    if (window.confirm('Are you sure you want to delete this agreement?')) {
      try {
        const response = await fetch(`http://localhost:4000/api/agreement-uploads/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) await fetchUploadedAgreements();
      } catch (error) {
        alert('Error deleting agreement');
      }
    }
  };

  const downloadUploadedAgreement = async (id, fileName) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-uploads/${id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      alert('Error downloading agreement');
    }
  };

  const viewAgreementDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/api/agreement-uploads/${id}`);
      if (response.ok) {
        const result = await response.json();
        setViewingAgreement(result.data);
        setShowViewModal(true);
      }
    } catch (error) {
      alert('Error loading details');
    }
  };

  // Filter Logic
  const filteredAgreements = filter === 'All'
    ? uploadedAgreements
    : uploadedAgreements.filter(agreement => agreement.status === filter);

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Component */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Upload / Approve"
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
        
        {/* Responsive Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-amber-200/50 shadow-sm px-4 py-4 sm:px-8">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4 lg:hidden p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <FaBars size={20} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-amber-900 truncate">Agreements</h1>
              <p className="text-xs sm:text-sm text-amber-600/70">Franchise Document Management</p>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
          
          {/* Upload Section (Responsive Grid) */}
          <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-100 transition-all hover:shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
              <FaUpload className="mr-2 text-amber-500" />
              Upload New Agreement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Select Franchise</label>
                <select
                  value={selectedFranchiseId}
                  onChange={(e) => setSelectedFranchiseId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none text-sm"
                >
                  <option value="">Choose a franchise...</option>
                  {franchises.map(f => (
                    <option key={f._id} value={f._id}>{f.franchise_name} - {f.owner?.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Document File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-all cursor-pointer"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !selectedFranchiseId}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 hover:shadow-amber-300 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
            {selectedFile && (
              <p className="mt-3 text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-lg inline-block">
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </section>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-gray-800">Review List</h3>
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
              {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filter === status 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive Agreement List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Desktop Table View (Hidden on mobile/tablet) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Document</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Franchise</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Uploaded By</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAgreements.map((agreement) => (
                    <tr key={agreement._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-red-50 text-red-500 rounded-lg mr-3"><FaClipboardList /></div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 max-w-[200px] truncate">{agreement.originalName || agreement.fileName}</div>
                            <div className="text-[10px] text-gray-400">{(agreement.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{agreement.franchiseName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{agreement.uploadedBy}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(agreement.uploadDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(agreement.status)}`}>
                          {agreement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center space-x-2">
                          <IconButton icon={<FaEye />} color="blue" onClick={() => viewAgreementDetails(agreement._id)} />
                          <IconButton icon={<FaDownload />} color="amber" onClick={() => downloadUploadedAgreement(agreement._id, agreement.originalName)} />
                          {agreement.status === 'Pending' && (
                            <>
                              <IconButton icon={<FaCheckCircle />} color="green" onClick={() => updateStatus(agreement._id, 'Approved')} />
                              <IconButton icon={<FaTimesCircle />} color="red" onClick={() => updateStatus(agreement._id, 'Rejected')} />
                            </>
                          )}
                          <IconButton icon={<FaTrash />} color="red" onClick={() => deleteAgreement(agreement._id)} outline />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View (Hidden on Desktop) */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredAgreements.map((agreement) => (
                <div key={agreement._id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="p-2 bg-red-50 text-red-500 rounded-lg mr-3 shrink-0"><FaClipboardList /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate pr-2 text-sm">{agreement.originalName || agreement.fileName}</p>
                        <p className="text-xs text-amber-600 font-medium">{agreement.franchiseName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(agreement.status)}`}>
                      {agreement.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl">
                    <div><span className="text-gray-400 uppercase font-bold tracking-tighter mr-1">By:</span> {agreement.uploadedBy}</div>
                    <div className="text-right text-gray-500">{new Date(agreement.uploadDate).toLocaleDateString()}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => viewAgreementDetails(agreement._id)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex justify-center"><FaEye /></button>
                    <button onClick={() => downloadUploadedAgreement(agreement._id, agreement.originalName)} className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-lg flex justify-center"><FaDownload /></button>
                    {agreement.status === 'Pending' && (
                      <>
                        <button onClick={() => updateStatus(agreement._id, 'Approved')} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg flex justify-center"><FaCheckCircle /></button>
                        <button onClick={() => updateStatus(agreement._id, 'Rejected')} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg flex justify-center"><FaTimesCircle /></button>
                      </>
                    )}
                    <button onClick={() => deleteAgreement(agreement._id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg flex justify-center"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>

            {filteredAgreements.length === 0 && (
              <div className="text-center py-16 px-4">
                <FaClipboardList className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                <h3 className="text-gray-900 font-bold">No Records Found</h3>
                <p className="text-gray-400 text-sm mt-1">Try changing your filter or upload a new file.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Fully Responsive Modal */}
      {showViewModal && viewingAgreement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowViewModal(false)}></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 sm:p-7 text-white shrink-0">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold truncate pr-4">{viewingAgreement.originalName}</h2>
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-widest mt-1">Document Details</p>
                </div>
                <button 
                  onClick={() => setShowViewModal(false)} 
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors shrink-0"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-8 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailCard label="Franchise" value={viewingAgreement.franchiseName} />
                <DetailCard label="Uploaded By" value={viewingAgreement.uploadedBy} />
                <DetailCard label="File Format" value={viewingAgreement.fileType} />
                <DetailCard label="Status" value={viewingAgreement.status} isBadge />
                <DetailCard label="Uploaded On" value={new Date(viewingAgreement.uploadDate).toLocaleString()} />
                <DetailCard label="File Size" value={`${(viewingAgreement.fileSize / (1024 * 1024)).toFixed(2)} MB`} />
              </div>
            </div>

            {/* Modal Footer (Responsive Wrap) */}
            <div className="p-5 sm:p-7 bg-slate-50 border-t flex flex-wrap gap-3 shrink-0">
              <button 
                onClick={() => downloadUploadedAgreement(viewingAgreement._id, viewingAgreement.originalName)} 
                className="flex-1 min-w-[140px] py-3 bg-amber-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FaDownload /> Download
              </button>
              
              {viewingAgreement.status === 'Pending' && (
                <>
                  <button 
                    onClick={() => { updateStatus(viewingAgreement._id, 'Approved'); setShowViewModal(false); }} 
                    className="flex-1 min-w-[140px] py-3 bg-green-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle /> Approve
                  </button>
                  <button 
                    onClick={() => { updateStatus(viewingAgreement._id, 'Rejected'); setShowViewModal(false); }} 
                    className="flex-1 min-w-[140px] py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <FaTimesCircle /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components to keep code clean ---

const IconButton = ({ icon, color, onClick, outline = false }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    red: 'bg-red-50 text-red-600 hover:bg-red-100'
  };
  return (
    <button 
      onClick={onClick} 
      className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-90 ${colorMap[color]}`}
    >
      {icon}
    </button>
  );
};

const DetailCard = ({ label, value, isBadge = false }) => (
  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
    {isBadge ? (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
        value === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
        value === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value}
      </span>
    ) : (
      <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
    )}
  </div>
);

export default UploadApprove;