import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CertificateTemplate from '../../components/CertificateTemplate';

const StudentCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const mockCertificates = [
    {
      id: 1,
      title: "Node.js Backend Development",
      course: "Node.js Backend Development",
      instructor: "Dr. Sarah Wilson",
      completionDate: "2023-12-15",
      score: 95,
      passingScore: 80,
      certificateNumber: "CERT-NODE-2023-001",
      status: "issued",
      downloadUrl: "/certificates/nodejs-backend.pdf",
      verificationUrl: "https://lms.verify.com/CERT-NODE-2023-001",
      credentialId: "abc123def456",
      skills: ["Node.js", "Express.js", "MongoDB", "REST APIs"],
      validUntil: "2026-12-15",
      issueDate: "2023-12-16",
      badge: "🏆"
    },
    {
      id: 2,
      title: "Digital Marketing Fundamentals",
      course: "Digital Marketing Fundamentals",
      instructor: "Ms. Emily Davis",
      completionDate: "2023-11-20",
      score: 92,
      passingScore: 70,
      certificateNumber: "CERT-DM-2023-002",
      status: "issued",
      downloadUrl: "/certificates/digital-marketing.pdf",
      verificationUrl: "https://lms.verify.com/CERT-DM-2023-002",
      credentialId: "def456ghi789",
      skills: ["SEO", "Social Media Marketing", "Email Marketing", "Analytics"],
      validUntil: "2026-11-20",
      issueDate: "2023-11-21",
      badge: "📈"
    },
    {
      id: 3,
      title: "React.js Complete Course",
      course: "React.js Complete Course",
      instructor: "Dr. Jane Smith",
      completionDate: null,
      score: 75,
      passingScore: 70,
      certificateNumber: null,
      status: "pending",
      downloadUrl: null,
      verificationUrl: null,
      credentialId: null,
      skills: ["React.js", "JavaScript", "Component Design", "State Management"],
      validUntil: null,
      issueDate: null,
      badge: "⚛️",
      estimatedIssueDate: "2024-01-15",
      progress: 95
    },
    {
      id: 4,
      title: "JavaScript ES6+ Masterclass",
      course: "JavaScript ES6+ Masterclass",
      instructor: "Prof. Michael Brown",
      completionDate: null,
      score: 68,
      passingScore: 75,
      certificateNumber: null,
      status: "not-eligible",
      downloadUrl: null,
      verificationUrl: null,
      credentialId: null,
      skills: ["JavaScript ES6+", "Async Programming", "Modern JavaScript"],
      validUntil: null,
      issueDate: null,
      badge: "📜",
      requiredScore: 75,
      attemptsRemaining: 1
    },
    {
      id: 5,
      title: "Python for Data Science",
      course: "Python for Data Science",
      instructor: "Prof. David Chen",
      completionDate: null,
      score: null,
      passingScore: 65,
      certificateNumber: null,
      status: "not-started",
      downloadUrl: null,
      verificationUrl: null,
      credentialId: null,
      skills: ["Python", "Data Analysis", "Pandas", "Visualization"],
      validUntil: null,
      issueDate: null,
      badge: "🐍",
      courseProgress: 30
    }
  ];

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setLoading(false);
        return;
      }

      // Fetch certificates from API
      const response = await axios.get('http://localhost:4000/certificates/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Certificates API response:', response.data);

      // Handle different response structures
      let certificatesData = [];
      if (Array.isArray(response.data)) {
        certificatesData = response.data;
      } else if (response.data.certificates) {
        certificatesData = response.data.certificates;
      } else if (response.data.data) {
        certificatesData = response.data.data;
      }

      // Transform API data to match frontend format
      const transformedCertificates = certificatesData.map(cert => ({
        id: cert.id || cert._id || cert.certificate_id,
        title: cert.course_name || cert.courseName || cert.course_title || 'Course',
        course: cert.course_name || cert.courseName || cert.course_title || 'Course',
        instructor: cert.instructor_name || cert.instructorName || 'Instructor',
        completionDate: cert.completion_date || cert.completionDate || cert.issued_on,
        score: cert.score || 100,
        passingScore: 70,
        certificateNumber: cert.certificate_number || cert.certificateNumber || `CERT-${cert.id}`,
        status: cert.status || 'issued',
        downloadUrl: cert.download_url || null,
        verificationUrl: cert.verification_url || `http://localhost:4000/certificates/verify/${cert.id}`,
        credentialId: cert.certificate_number || cert.certificateNumber || cert.id,
        skills: cert.skills || [],
        validUntil: cert.valid_until || cert.validUntil || null,
        issueDate: cert.issued_on || cert.issuedOn || cert.completion_date,
        badge: '🏆',
        courseDuration: cert.course_duration || cert.courseDuration || 'N/A',
        certificateId: cert.id || cert._id || cert.certificate_id,
        studentName: cert.student_name || cert.studentName || 'Student',
        instructorName: cert.instructor_name || cert.instructorName || 'Instructor'
      }));

      setCertificates(transformedCertificates);
      console.log(`Loaded ${transformedCertificates.length} certificates`);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      // Use mock data as fallback on error
      setCertificates(mockCertificates);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = (certificate) => {
    setViewingCertificate(certificate);
    setShowCertificateModal(true);
  };

  const handleCloseCertificateModal = () => {
    setShowCertificateModal(false);
    setViewingCertificate(null);
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cert.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'issued':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'not-eligible':
        return 'bg-red-100 text-red-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'issued':
        return 'Issued';
      case 'pending':
        return 'Pending';
      case 'not-eligible':
        return 'Not Eligible';
      case 'not-started':
        return 'Not Started';
      default:
        return status;
    }
  };

  const certificateCounts = {
    all: certificates.length,
    issued: certificates.filter(c => c.status === 'issued').length,
    pending: certificates.filter(c => c.status === 'pending').length,
    'not-eligible': certificates.filter(c => c.status === 'not-eligible').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <div className="mt-4 sm:mt-0">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Certificate Guidelines
          </button>
        </div>
      </div>

      {/* Certificate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🏆</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{certificateCounts.all}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Issued</p>
              <p className="text-2xl font-bold text-gray-900">{certificateCounts.issued}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{certificateCounts.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Not Eligible</p>
              <p className="text-2xl font-bold text-gray-900">{certificateCounts['not-eligible']}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Certificates</label>
            <input
              type="text"
              placeholder="Search by course title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="issued">Issued</option>
              <option value="pending">Pending</option>
              <option value="not-eligible">Not Eligible</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCertificates.map((certificate) => (
          <div key={certificate.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Certificate Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">{certificate.badge}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{certificate.title}</h3>
                    <p className="text-sm text-gray-600">by {certificate.instructor}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(certificate.status)}`}>
                  {getStatusLabel(certificate.status)}
                </span>
              </div>

              {/* Certificate Details */}
              <div className="space-y-4">
                {/* Status-specific information */}
                {certificate.status === 'issued' && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Certificate #:</span>
                        <div className="font-medium">{certificate.certificateNumber}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Issue Date:</span>
                        <div className="font-medium">{certificate.issueDate}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Completion Date:</span>
                        <div className="font-medium">{certificate.completionDate}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Valid Until:</span>
                        <div className="font-medium">{certificate.validUntil}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Score:</span>
                        <div className="font-medium">{certificate.score}% (Pass: {certificate.passingScore}%)</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Credential ID:</span>
                        <div className="font-medium text-xs">{certificate.credentialId}</div>
                      </div>
                    </div>
                  </div>
                )}

                {certificate.status === 'pending' && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Certificate Processing</span>
                      <span className="text-sm text-gray-600">{certificate.progress}% complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${certificate.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Score: {certificate.score}% (Pass: {certificate.passingScore}%)</div>
                      <div>Estimated Issue Date: {certificate.estimatedIssueDate}</div>
                    </div>
                  </div>
                )}

                {certificate.status === 'not-eligible' && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">
                      <div className="mb-2">
                        <span className="font-medium text-red-600">Requirements not met</span>
                      </div>
                      <div>Current Score: {certificate.score}%</div>
                      <div>Required Score: {certificate.requiredScore}%</div>
                      {certificate.attemptsRemaining > 0 && (
                        <div>Attempts Remaining: {certificate.attemptsRemaining}</div>
                      )}
                    </div>
                  </div>
                )}

                {certificate.status === 'not-started' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">
                      <div className="mb-2">
                        <span className="font-medium">Complete the course to earn this certificate</span>
                      </div>
                      <div>Course Progress: {certificate.courseProgress}%</div>
                      <div>Passing Score Required: {certificate.passingScore}%</div>
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Skills Certified</h4>
                  <div className="flex flex-wrap gap-2">
                    {certificate.skills.map((skill, index) => (
                      <span
                        key={`cert-skill-${skill}-${index}`}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  {certificate.status === 'issued' && (
                    <>
                      <button
                        onClick={() => handleViewCertificate(certificate)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        View Certificate
                      </button>
                      <button
                        onClick={() => handleViewCertificate(certificate)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => window.open(`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificate.course)}&organizationId=&issueYear=${new Date(certificate.issueDate).getFullYear()}&issueMonth=${new Date(certificate.issueDate).getMonth() + 1}&certUrl=${encodeURIComponent(certificate.verificationUrl || '')}&certId=${encodeURIComponent(certificate.certificateNumber)}`, '_blank')}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        Share on LinkedIn
                      </button>
                    </>
                  )}

                  {certificate.status === 'pending' && (
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      Check Status
                    </button>
                  )}

                  {certificate.status === 'not-eligible' && certificate.attemptsRemaining > 0 && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Retake Course
                    </button>
                  )}

                  {certificate.status === 'not-started' && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Continue Course
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCertificates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates found</h3>
          <p className="text-gray-600 mb-6">Complete courses to earn certificates</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Browse Courses
          </button>
        </div>
      )}

      {/* Certificate Verification Info */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">About Digital Certificates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Verification</h4>
            <p>All certificates include a unique verification URL and credential ID for employers to verify authenticity.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Validity</h4>
            <p>Certificates are valid for 3 years from the issue date. You can retake courses to renew certifications.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
            <p>Complete all course requirements and achieve the minimum passing score to earn a certificate.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recognition</h4>
            <p>Our certificates are recognized by industry partners and can be shared on professional networks.</p>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && viewingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-7xl w-full max-h-[95vh] overflow-y-auto bg-white rounded-lg">
            <button
              onClick={handleCloseCertificateModal}
              className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <CertificateTemplate
              studentName={viewingCertificate.studentName || 'Student'}
              courseName={viewingCertificate.course || 'Course'}
              instructorName={viewingCertificate.instructorName || 'Instructor'}
              courseDuration={viewingCertificate.courseDuration || 'N/A'}
              completionDate={viewingCertificate.completionDate || new Date().toISOString().split('T')[0]}
              certificateId={viewingCertificate.certificateId || ''}
              certificateNumber={viewingCertificate.certificateNumber || ''}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
