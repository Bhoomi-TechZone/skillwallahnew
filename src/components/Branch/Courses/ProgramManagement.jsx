import { useState, useEffect } from 'react';
import { FaBook, FaPlus, FaEdit, FaTrash, FaSearch, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { branchProgramService } from '../../../services/branchProgramService';

const ProgramManagement = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [formData, setFormData] = useState({
    program_name: '',
    description: '',
    program_type: 'certificate',
    duration_years: '',
    total_semesters: '',
    eligibility: '',
    program_fee: '',
    status: 'active'
  });

  // Load programs on component mount
  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await branchProgramService.getPrograms();
      if (result.success) {
        setPrograms(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = Array.isArray(programs) ? programs.filter(program =>
    program.program_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleCreate = () => {
    setFormData({
      program_name: '',
      description: '',
      program_type: 'certificate',
      duration_years: '',
      total_semesters: '',
      eligibility: '',
      program_fee: '',
      status: 'active'
    });
    setSelectedProgram(null);
    setShowModal(true);
  };

  const handleEdit = (program) => {
    setFormData({
      program_name: program.program_name,
      description: program.description,
      program_type: program.program_type || 'certificate',
      duration_years: program.duration_years || '',
      total_semesters: program.total_semesters || '',
      eligibility: program.eligibility || '',
      program_fee: program.program_fee || '',
      status: program.status
    });
    setSelectedProgram(program);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedProgram) {
        // Update existing program
        const result = await branchProgramService.updateProgram(selectedProgram.id, formData);
        if (result.success) {
          await loadPrograms(); // Reload to get updated data
          setShowModal(false);
        } else {
          setError(result.error);
        }
      } else {
        // Create new program
        const result = await branchProgramService.createProgram(formData);
        if (result.success) {
          await loadPrograms(); // Reload to get updated data
          setShowModal(false);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (programId) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;

    const newStatus = program.status === 'active' ? 'inactive' : 'active';

    try {
      const result = await branchProgramService.updateProgram(programId, { status: newStatus });
      if (result.success) {
        await loadPrograms();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update program status');
    }
  };

  const handleDelete = async (programId) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        const result = await branchProgramService.deleteProgram(programId);
        if (result.success) {
          await loadPrograms();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to delete program');
      }
    }
  };

  return (
    <BranchLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="p-4 md:px-6 md:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                  <FaBook className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-secondary-900">MANAGE PROGRAM</h1>
                  <p className="text-xs md:text-sm text-secondary-600 mt-0.5 md:mt-1">Create and manage academic programs</p>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <FaPlus className="w-4 h-4" />
                <span>Add Program</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:px-6 md:py-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md w-full">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <span className="text-gray-500">Loading programs...</span>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {searchTerm ? 'No programs found matching your search.' : 'No programs available. Create your first program to get started.'}
              </div>
            ) : (
              filteredPrograms.map((program) => (
                <div key={program.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-semibold text-secondary-900">{program.program_name}</h3>
                      <p className="text-xs text-indigo-600 mt-1">Created: {new Date(program.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => toggleStatus(program.id)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${program.status === 'active'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {program.status === 'active' ? (
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

                  <p className="text-xs text-gray-600 line-clamp-2">{program.description}</p>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                      {program.program_type}
                    </span>
                    {program.duration_years && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {program.duration_years} Years
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex space-x-3">
                      <span className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-1 rounded">
                        {program.total_courses || 0} Courses
                      </span>
                      <span className="text-xs font-medium text-orange-800 bg-orange-50 px-2 py-1 rounded">
                        {program.total_students || 0} Students
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(program)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded bg-blue-50/50"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(program.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded bg-red-50/50"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary-700">S.No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary-700">Program Name</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-secondary-700">Courses</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-secondary-700">Students</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-secondary-700">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-secondary-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          <span className="text-gray-500">Loading programs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        {searchTerm ? 'No programs found matching your search.' : 'No programs available. Create your first program to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map((program, index) => (
                      <tr key={program.id} className="hover:bg-indigo-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-secondary-900">{index + 1}.</span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-secondary-900">{program.program_name}</h3>
                            <p className="text-xs text-gray-600 line-clamp-1">{program.description}</p>
                            <p className="text-xs text-indigo-600">Created: {new Date(program.created_at).toLocaleDateString()}</p>
                            <div className="flex space-x-2 mt-1">
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {program.program_type}
                              </span>
                              {program.duration_years && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  {program.duration_years} Years
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {program.total_courses || 0} Courses
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {program.total_students || 0} Students
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleStatus(program.id)}
                            className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors mx-auto ${program.status === 'active'
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                          >
                            {program.status === 'active' ? (
                              <>
                                <FaToggleOn className="w-4 h-4" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <FaToggleOff className="w-4 h-4" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleEdit(program)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(program.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-sm border border-white/30 overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSubmit}>
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedProgram ? 'Edit Program' : 'Add New Program'}
                  </h3>
                </div>

                {/* Modal Body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.program_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, program_name: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter program name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Program Type
                    </label>
                    <select
                      value={formData.program_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, program_type: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="certificate">Certificate</option>
                      <option value="diploma">Diploma</option>
                      <option value="academic">Academic</option>
                      <option value="professional">Professional</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration (Years)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.duration_years}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_years: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Semesters
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.total_semesters}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_semesters: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter program description"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Eligibility
                    </label>
                    <input
                      type="text"
                      value={formData.eligibility}
                      onChange={(e) => setFormData(prev => ({ ...prev, eligibility: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="12th Pass, Graduation"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.program_fee}
                        onChange={(e) => setFormData(prev => ({ ...prev, program_fee: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Fee"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
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
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>{selectedProgram ? 'Update' : 'Create'}</span>
                    )}
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

export default ProgramManagement;