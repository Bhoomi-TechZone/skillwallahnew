import {
  AcademicCapIcon,
  DocumentIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import LessonManager from './LessonManager';

const ModuleManager = ({ courseId, isOpen, onClose }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [selectedModuleForLessons, setSelectedModuleForLessons] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log('ModuleManager useEffect:', { isOpen, courseId });
    if (isOpen && courseId) {
      console.log('About to fetch modules...');
      fetchModules();
    }
  }, [isOpen, courseId]);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:4000/courses/${courseId}/modules`;
      console.log('Fetching modules for course:', courseId);
      console.log('Full URL:', url);
      console.log('Using token:', token ? 'Token present' : 'No token');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Modules data:', data);
          setModules(data);
        } else {
          const text = await response.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response');
        }
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch modules: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('Fetch modules error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a module title');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchModules();
        setShowCreateModal(false);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create module');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a module title');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/courses/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchModules();
        setShowCreateModal(false);
        setEditingModule(null);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update module');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (module) => {
    if (!window.confirm(`Are you sure you want to delete "${module.title}" and all its lessons?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/courses/modules/${module.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchModules();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete module');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      order: modules.length + 1
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingModule(null);
    setShowCreateModal(true);
  };

  const openEditModal = (module) => {
    setFormData({
      title: module.title,
      description: module.description || '',
      order: module.order
    });
    setEditingModule(module);
    setShowCreateModal(true);
  };



  const handleManageLessons = (module) => {
    setSelectedModuleForLessons(module);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#988913] to-[#887a11] text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Course Modules</h2>
              <p className="text-sm opacity-90">Browse and manage your course modules with our card-based interface</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Add Module Button */}
          <div className="mb-6">
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#988913] to-[#887a11] text-white rounded-lg hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Module</span>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#988913] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading modules...</p>
            </div>
          ) : (
            /* Modules Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <AcademicCapIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No modules yet</h3>
                  <p className="text-gray-600 mb-6">Start by creating your first module to organize your course content.</p>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#988913] to-[#887a11] text-white font-semibold rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create First Module
                  </button>
                </div>
              ) : (
                modules.map((module) => (
                  <div
                    key={module.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group"
                  >
                    {/* Module Card Header */}
                    <div className="bg-gradient-to-br from-[#988913]/10 to-[#887a11]/10 p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-br from-[#988913] to-[#887a11] rounded-xl">
                            <FolderOpenIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[#988913] bg-[#988913]/10 px-2 py-1 rounded-full inline-block mb-1">
                              Module {module.order}
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                              {module.title}
                            </h3>
                          </div>
                        </div>

                        {/* Action Menu */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(module)}
                            className="p-2 text-gray-500 hover:text-[#988913] hover:bg-white rounded-lg transition-all duration-200"
                            title="Edit module"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(module)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete module"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {module.description && (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                          {module.description}
                        </p>
                      )}
                    </div>

                    {/* Module Stats */}
                    <div className="p-6">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <VideoCameraIcon className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{module.lessons_count || 0}</div>
                          <div className="text-xs text-gray-500">Lessons</div>
                        </div>

                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <VideoCameraIcon className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{module.video_count || 0}</div>
                          <div className="text-xs text-gray-500">Videos</div>
                        </div>

                        <div className="text-center">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <DocumentIcon className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="text-lg font-bold text-gray-900">{module.pdf_count || 0}</div>
                          <div className="text-xs text-gray-500">PDFs</div>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${module.lessons_count > 0 ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}></div>
                          <span className={`text-sm font-medium ${module.lessons_count > 0 ? 'text-orange-700' : 'text-yellow-700'
                            }`}>
                            {module.lessons_count > 0 ? 'Active' : 'Setup Required'}
                          </span>
                        </div>

                        <span className="text-xs text-gray-500">
                          {module.lessons_count === 0 ? 'No content yet' : `${module.lessons_count} item${module.lessons_count !== 1 ? 's' : ''}`}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleManageLessons(module)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#988913] to-[#887a11] text-white font-semibold rounded-xl hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 group"
                      >
                        <VideoCameraIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>{module.lessons_count > 0 ? 'Manage Content' : 'Add Content'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingModule ? 'Edit Module' : 'Create New Module'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913]"
                    placeholder="e.g., Introduction to Cloud Computing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913]"
                    placeholder="Brief description of this module"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module Order *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#988913] focus:border-[#988913]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingModule(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={editingModule ? handleUpdateModule : handleCreateModule}
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-[#988913] to-[#887a11] text-white rounded-lg hover:from-[#887a11] hover:to-[#776a0f] transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingModule ? 'Update Module' : 'Create Module')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Manager Modal */}
      {selectedModuleForLessons && (
        <LessonManager
          moduleId={selectedModuleForLessons.id}
          moduleName={selectedModuleForLessons.title}
          isOpen={!!selectedModuleForLessons}
          onClose={() => setSelectedModuleForLessons(null)}
          onLessonsUpdated={fetchModules} // Refresh modules to update lesson count
        />
      )}
    </div>
  );
};

export default ModuleManager;