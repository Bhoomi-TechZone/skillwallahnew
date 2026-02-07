import { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaUserGraduate, FaCalendarAlt, FaEye, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchBatchService } from '../../../services/branchBatchService';
import { branchProgramService } from '../../../services/branchProgramService';
import { branchCourseService } from '../../../services/branchCourseService';

const BatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState({ show: false, batch: null });
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [formData, setFormData] = useState({
    batchName: '',
    branchCode: '',
    programId: '',
    courseId: '',
    startDate: '',
    endDate: '',
    maxCapacity: '',
    instructor: '',
    status: 'active'
  });

  // Get branch code from token
  const getBranchCode = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return 'FR-SK-0940'; // Force return branch code
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'DEFAULT';
  };

  const loadPrograms = async () => {
    try {
      const response = await branchProgramService.getPrograms();
      if (response.success && response.data) {
        // Filter only active programs
        const activePrograms = response.data.filter(program => program.status === 'active');
        setPrograms(activePrograms);
        console.log('✅ [BatchManagement] Loaded active programs:', activePrograms.length);
      } else {
        console.error('❌ Error loading programs:', response.error);
        setPrograms([]);
      }
    } catch (error) {
      console.error('❌ Error loading programs:', error);
      setPrograms([]);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await branchCourseService.getCourses();
      if (response.success && response.data) {
        setCourses(response.data);
        console.log('✅ [BatchManagement] Loaded courses:', response.data.length);
      } else {
        console.error('❌ Error loading courses:', response.error);
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      setCourses([]);
    }
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await branchBatchService.getBatches();
      console.log('🔍 [BatchManagement] Batches response:', response);

      if (response.success && response.data) {
        setBatches(response.data);
        console.log('✅ [BatchManagement] Loaded batches:', response.data.length);
      } else {
        console.error('❌ Error loading batches:', response.error);
        setError(response.error || 'Failed to load batches');
        setBatches([]);
      }
    } catch (error) {
      console.error('❌ Error loading batches:', error);
      setError('Failed to load batches. Please try again.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadPrograms(),
        loadCourses(),
        loadBatches()
      ]);
    };
    loadAllData();
  }, []);

  const filteredBatches = Array.isArray(batches) ? batches.filter(batch =>
    batch.batch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleCreate = () => {
    setFormData({
      batchName: '',
      branchCode: getBranchCode(),
      programId: '',
      courseId: '',
      startDate: '',
      endDate: '',
      maxCapacity: '',
      instructor: '',
      status: 'active'
    });
    setSelectedBatch(null);
    setShowModal(true);
  };

  const handleEdit = (batch) => {
    console.log('🔍 [BatchManagement] Editing batch:', batch);
    setFormData({
      batchName: batch.batch_name || batch.batchName || '',
      branchCode: batch.branch_code || getBranchCode(),
      programId: batch.program_id || batch.programId || '',
      courseId: batch.course_id || batch.courseId || '',
      startDate: batch.start_date ? batch.start_date.split('T')[0] : (batch.startDate ? batch.startDate.split('T')[0] : ''),
      endDate: batch.end_date ? batch.end_date.split('T')[0] : (batch.endDate ? batch.endDate.split('T')[0] : ''),
      maxCapacity: (batch.max_capacity || batch.maxCapacity || '').toString(),
      instructor: batch.instructor_name || batch.instructor || '',
      status: batch.status || 'active'
    });
    setSelectedBatch(batch);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Map form data to API format
      const batchData = {
        batch_name: formData.batchName,
        program_id: formData.programId,
        course_id: formData.courseId,
        instructor_name: formData.instructor,
        start_date: formData.startDate,
        end_date: formData.endDate,
        max_capacity: parseInt(formData.maxCapacity) || 30,
        status: formData.status,
        branch_code: formData.branchCode || getBranchCode()
      };

      console.log('🔍 [BatchManagement] Submitting batch data:', batchData);

      let response;
      if (selectedBatch) {
        response = await branchBatchService.updateBatch(selectedBatch.id, batchData);
      } else {
        response = await branchBatchService.createBatch(batchData);
      }

      console.log('✅ [BatchManagement] Batch operation response:', response);

      if (response.success) {
        await loadBatches(); // Refresh the list
        setShowModal(false);
        alert(selectedBatch ? 'Batch updated successfully!' : 'Batch created successfully!');
      } else {
        throw new Error(response.error || 'Failed to save batch');
      }
    } catch (error) {
      console.error('❌ Error saving batch:', error);
      alert(`Failed to save batch: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (batch) => {
    setViewModal({ show: true, batch });
  };

  const toggleStatus = async (batchId) => {
    try {
      setLoading(true);
      const batch = batches.find(b => b.id === batchId);

      if (!batch) {
        alert('Batch not found');
        return;
      }

      // Determine new status (toggle current status)
      const currentStatus = batch.status || 'inactive';
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      console.log('🔄 [BatchManagement] Toggling status for batch:', batch.batch_name || batch.batchName);
      console.log('🔄 [BatchManagement] Current status:', currentStatus);
      console.log('🔄 [BatchManagement] New status:', newStatus);

      // Prepare update data
      const updateData = {
        ...batch,
        status: newStatus
      };

      console.log('📝 [BatchManagement] Sending update data:', updateData);

      const response = await branchBatchService.updateBatch(batchId, updateData);

      console.log('📬 [BatchManagement] Toggle status response:', response);

      if (response.success) {
        // Update local state immediately for better UX
        setBatches(prevBatches =>
          prevBatches.map(b =>
            b.id === batchId
              ? { ...b, status: newStatus }
              : b
          )
        );

        console.log('✅ [BatchManagement] Status updated successfully to:', newStatus);
        setError(null);
      } else {
        console.error('❌ [BatchManagement] Failed to update status:', response.error);
        setError(response.error || 'Failed to update batch status.');
        alert(`Failed to update batch status: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [BatchManagement] Error updating batch status:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update batch status.';
      setError(errorMessage);
      alert(`Failed to update batch status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (batchId) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await branchBatchService.deleteBatch(batchId);
        await loadBatches();
      } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Failed to delete batch.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-orange-100 text-orange-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCapacityColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-700';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  };

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="p-4 md:px-6 md:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 rounded-lg">
                  <FaUsers className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-secondary-900">MANAGE BATCH</h1>
                  <p className="text-xs md:text-sm text-secondary-600 mt-0.5 md:mt-1">Create and manage student batches</p>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <FaPlus className="w-4 h-4" />
                <span>Create New Batch</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:px-6 md:py-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4 mb-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <span className="text-gray-500">Loading batches...</span>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                No batches found
              </div>
            ) : (
              filteredBatches.map((batch) => (
                <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-semibold text-secondary-900">{batch.batch_name || batch.batchName}</h3>
                      <div className="flex items-center space-x-1 text-xs text-purple-600 mt-1">
                        <FaUserGraduate className="w-3 h-3" />
                        <span>{batch.instructor_name || batch.instructor || 'N/A'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(batch.id)}
                      disabled={loading}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${batch.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {batch.status === 'active' ? (
                        <>
                          <FaToggleOn className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <FaToggleOff className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FaCalendarAlt className="text-orange-600" />
                      <span className="font-medium">Start: {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : (batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'N/A')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaCalendarAlt className="text-red-600" />
                      <span className="font-medium">End: {batch.end_date ? new Date(batch.end_date).toLocaleDateString() : (batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'N/A')}</span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium flex items-center space-x-1">
                          <FaUsers className="w-3 h-3 text-purple-600" />
                          <span>Capacity</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getCapacityColor(batch.current_enrollment || 0, batch.max_capacity || batch.maxCapacity || 30)}`}>
                          {batch.current_enrollment || 0}/{batch.max_capacity || batch.maxCapacity || 30}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${((batch.max_capacity || batch.maxCapacity) > 0) ? Math.min(100, Math.round(((batch.current_enrollment || 0) / (batch.max_capacity || batch.maxCapacity || 30)) * 100)) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-gray-100 space-x-2">
                    <button
                      onClick={() => handleView(batch)}
                      className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(batch)}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Batches Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Branch Code</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-secondary-700">Batch Name</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Duration</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Capacity</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBatches.map((batch, index) => (
                    <tr key={batch.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-secondary-900">{index + 1}.</span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          {batch.branch_code || getBranchCode()}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-secondary-900">{batch.batch_name || batch.batchName}</h3>
                          <div className="flex items-center space-x-1 text-xs text-purple-600">
                            <FaUserGraduate className="w-3 h-3" />
                            <span>{batch.instructor_name || batch.instructor || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center space-y-1">
                          <div className="flex items-center justify-center space-x-1 text-xs text-orange-600">
                            <FaCalendarAlt className="w-3 h-3" />
                            <span>Start: {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : (batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'N/A')}</span>
                          </div>
                          <div className="flex items-center justify-center space-x-1 text-xs text-red-600">
                            <FaCalendarAlt className="w-3 h-3" />
                            <span>End: {batch.end_date ? new Date(batch.end_date).toLocaleDateString() : (batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'N/A')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCapacityColor(batch.current_enrollment || 0, batch.max_capacity || batch.maxCapacity || 30)}`}>
                            <FaUsers className="w-3 h-3 mr-1" />
                            {batch.current_enrollment || 0}/{batch.max_capacity || batch.maxCapacity || 30}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {((batch.max_capacity || batch.maxCapacity) > 0) ? Math.round(((batch.current_enrollment || 0) / (batch.max_capacity || batch.maxCapacity || 30)) * 100) : 0}% Full
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => toggleStatus(batch.id)}
                            disabled={loading}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${batch.status === 'active'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                              }`}
                            title={`Toggle status (Currently ${batch.status === 'active' ? 'Active' : 'Inactive'})`}
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline mr-1"></div>
                                {batch.status === 'active' ? 'Active' : 'Inactive'}
                              </>
                            ) : (
                              <>
                                {batch.status === 'active' ? (
                                  <>
                                    <FaToggleOn className="w-3 h-3 inline mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <FaToggleOff className="w-3 h-3 inline mr-1" />
                                    Inactive
                                  </>
                                )}
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleView(batch)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="View Details"
                          >
                            <FaEye className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleEdit(batch)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDelete(batch.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* View Batch Modal */}
        {viewModal.show && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-lg border border-white/30 overflow-y-auto max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-purple-700 flex items-center">
                  <FaEye className="mr-2" />
                  Batch Details
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-purple-700 uppercase tracking-wide">Batch Name</label>
                    <p className="text-sm font-semibold text-purple-900 mt-1">{viewModal.batch?.batch_name || viewModal.batch?.batchName || 'N/A'}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Branch Code</label>
                    <p className="text-sm font-semibold text-yellow-900 mt-1">{viewModal.batch?.branch_code || getBranchCode()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Program</label>
                    <p className="text-sm font-semibold text-blue-900 mt-1">{viewModal.batch?.program_name || 'N/A'}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Course</label>
                    <p className="text-sm font-semibold text-indigo-900 mt-1">{viewModal.batch?.course_name || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-orange-700 uppercase tracking-wide">Start Date</label>
                    <p className="text-sm font-semibold text-orange-900 mt-1">
                      {viewModal.batch?.start_date ? new Date(viewModal.batch.start_date).toLocaleDateString() :
                        (viewModal.batch?.startDate ? new Date(viewModal.batch.startDate).toLocaleDateString() : 'N/A')}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-red-700 uppercase tracking-wide">End Date</label>
                    <p className="text-sm font-semibold text-red-900 mt-1">
                      {viewModal.batch?.end_date ? new Date(viewModal.batch.end_date).toLocaleDateString() :
                        (viewModal.batch?.endDate ? new Date(viewModal.batch.endDate).toLocaleDateString() : 'N/A')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-green-700 uppercase tracking-wide">Instructor</label>
                    <p className="text-sm font-semibold text-green-900 mt-1">{viewModal.batch?.instructor_name || viewModal.batch?.instructor || 'N/A'}</p>
                  </div>
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-teal-700 uppercase tracking-wide">Capacity</label>
                    <p className="text-sm font-semibold text-teal-900 mt-1">
                      {viewModal.batch?.current_enrollment || 0}/{viewModal.batch?.max_capacity || viewModal.batch?.maxCapacity || 30}
                    </p>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-pink-700 uppercase tracking-wide">Utilization</label>
                    <p className="text-sm font-semibold text-pink-900 mt-1">
                      {((viewModal.batch?.max_capacity || viewModal.batch?.maxCapacity) > 0) ?
                        Math.round(((viewModal.batch?.current_enrollment || 0) / (viewModal.batch?.max_capacity || viewModal.batch?.maxCapacity || 30)) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${viewModal.batch?.status === 'active'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : viewModal.batch?.status === 'completed'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}>
                        {viewModal.batch?.status === 'active' ? (
                          <>
                            <FaToggleOn className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : viewModal.batch?.status === 'completed' ? (
                          <>
                            <FaUsers className="w-3 h-3 mr-1" />
                            Completed
                          </>
                        ) : (
                          <>
                            <FaToggleOff className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setViewModal({ show: false, batch: null })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModal({ show: false, batch: null });
                    handleEdit(viewModal.batch);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <FaEdit className="w-4 h-4" />
                  <span>Edit Batch</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-sm border border-white/30 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedBatch ? 'Edit Batch' : 'Create New Batch'}
                  </h3>
                </div>

                {/* Modal Body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Batch Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.batchName}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchName: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter batch name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Branch Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.branchCode || getBranchCode()}
                      onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Branch code"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Program *
                      </label>
                      <select
                        required
                        value={formData.programId}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, programId: e.target.value, courseId: '' }));
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select Program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.program_name || program.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Course *
                      </label>
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.course_name || course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Capacity *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.maxCapacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Instructor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.instructor}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter instructor name"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : `${selectedBatch ? 'Update' : 'Create'} Batch`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default BatchManagement;