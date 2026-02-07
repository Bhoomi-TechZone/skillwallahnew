import { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';

const API_BASE_URL = 'http://localhost:4000';

const StudentStudyMaterial = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

  useEffect(() => {
    loadStudyMaterials();
  }, []);

  const loadStudyMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.error('No access token found');
        setLoading(false);
        return;
      }

      console.log('📚 [StudentStudyMaterial] Loading study materials...');

      const response = await axios.get(
        `${API_BASE_URL}/api/branch-study-materials/materials`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [StudentStudyMaterial] Response:', response.data);

      // Backend returns array of StudyMaterialResponse
      const materialsData = Array.isArray(response.data) ? response.data : [];

      // Transform backend data
      const transformedMaterials = materialsData.map(material => ({
        id: material.id,
        title: material.material_name,
        description: material.description || '',
        subject: material.subject_name || material.course_name || 'General',
        courseName: material.course_name,
        programName: material.program_name,
        batchName: material.batch_name,
        fileType: material.file_format || material.material_type,
        fileSize: material.file_size ? `${(material.file_size / 1024 / 1024).toFixed(2)} MB` : null,
        fileUrl: material.file_url,
        externalLink: material.external_link,
        duration: material.duration,
        tags: material.tags,
        uploadedDate: material.created_at,
        viewCount: material.view_count || 0,
        downloadCount: material.download_count || 0,
        branchCode: material.branch_code,
        franchiseCode: material.franchise_code
      }));

      setMaterials(transformedMaterials);
      console.log(`📚 [StudentStudyMaterial] Loaded ${transformedMaterials.length} materials`);
      setLoading(false);

    } catch (error) {
      console.error('❌ [StudentStudyMaterial] Error loading study materials:', error);
      setMaterials([]);
      setLoading(false);
    }
  };

  const handleDownload = async (materialId) => {
    const token = localStorage.getItem('access_token');
    const material = materials.find(m => m.id === materialId);

    if (!material) {
      console.error('Material not found');
      return;
    }

    try {
      // Track download
      await axios.post(
        `${API_BASE_URL}/api/branch-study-materials/materials/${materialId}/download`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      ).catch(err => console.log('Download tracking failed:', err));

      // Get file URL
      let fileUrl = material.fileUrl || material.externalLink;

      if (!fileUrl) {
        alert('No downloadable file available');
        return;
      }

      // If it's a relative path, make it absolute
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `${API_BASE_URL}/${fileUrl.replace(/^\//, '')}`;
      }

      console.log('Downloading from:', fileUrl);

      // Fetch the file as blob and trigger download
      const response = await fetch(fileUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = material.title || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);

      console.log('✅ Download completed');

    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      let fileUrl = material.fileUrl || material.externalLink;
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `${API_BASE_URL}/${fileUrl.replace(/^\//, '')}`;
      }
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      } else {
        alert('Unable to download file');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center">
          <span className="mr-3">📚</span>
          Study Materials
        </h1>
        <p className="text-teal-100 mt-1">Access your course materials and resources</p>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Study Materials Available</h3>
          <p className="text-gray-600">Study materials will appear here once uploaded by your instructor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials
            .filter(material => selectedSubject === 'All Subjects' || material.subject === selectedSubject)
            .map((material) => (
              <div
                key={material.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Material Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-2xl">
                      {material.fileType === 'video' ? '🎥' :
                        material.fileType === 'audio' ? '🎵' :
                          material.fileType === 'image' ? '🖼️' :
                            material.fileType === 'link' ? '🔗' : '📄'}
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full uppercase">
                      {material.fileType || 'Document'}
                    </span>
                  </div>
                </div>

                {/* Material Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    {material.title}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {material.courseName && (
                      <div className="flex items-center">
                        <span className="mr-2">📚</span>
                        <span>{material.courseName}</span>
                      </div>
                    )}
                    {material.subject && (
                      <div className="flex items-center">
                        <span className="mr-2">📖</span>
                        <span>{material.subject}</span>
                      </div>
                    )}
                    {material.uploadedDate && (
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        <span>{new Date(material.uploadedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {material.fileSize && (
                      <div className="flex items-center">
                        <span className="mr-2">💾</span>
                        <span>{material.fileSize}</span>
                      </div>
                    )}
                    {material.duration && (
                      <div className="flex items-center">
                        <span className="mr-2">⏱️</span>
                        <span>{material.duration}</span>
                      </div>
                    )}
                  </div>

                  {material.description && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                      {material.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center">
                      <span className="mr-1">👁️</span>
                      {material.viewCount || 0}
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">⬇️</span>
                      {material.downloadCount || 0}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {(material.fileUrl || material.externalLink) && (
                      <button
                        onClick={() => handleDownload(material.id)}
                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
                      >
                        <span className="mr-1">⬇️</span>
                        {material.externalLink ? 'Open Link' : 'Download'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default StudentStudyMaterial;
