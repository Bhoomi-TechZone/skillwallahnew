import { useState, useEffect } from 'react';
import { FaUserTie, FaPlus, FaEdit, FaTrash, FaEye, FaPhone, FaEnvelope, FaIdCard, FaDollarSign, FaSpinner, FaSearch, FaBars, FaTimes, FaGraduationCap } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';

const BranchInstructors = () => {
    const [instructors, setInstructors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        specialization: '',
        qualification: '',
        experience: '',
        basicSalary: '',
        status: 'active'
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    const specializations = [
        'Machine Learning', 'Web Development', 'Data Science', 'Mobile App Development',
        'Cybersecurity', 'Cloud Computing', 'DevOps', 'Artificial Intelligence',
        'Blockchain', 'UI/UX Design', 'Database Management', 'Network Administration'
    ];

    const getAuthToken = () => {
        return localStorage.getItem('token') || localStorage.getItem('branchToken') || localStorage.getItem('adminToken');
    };

    const fetchDepartments = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;
            const response = await fetch(`${API_BASE_URL}/instructor/departments`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                let departmentsList = data.departments || data.data || data.result || (Array.isArray(data) ? data : []);
                const processedDepartments = departmentsList.map(dept => (typeof dept === 'object' && dept.name ? dept.name : dept));
                setDepartments(processedDepartments.length > 0 ? processedDepartments : ['Computer Science', 'Management', 'Engineering']);
            }
        } catch (error) {
            setDepartments(['Computer Science', 'Management', 'Engineering']);
        }
    };

    const fetchInstructors = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${API_BASE_URL}/instructor/instructors`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setInstructors(Array.isArray(data) ? data : []);
        } catch (error) {
            setError(error.message);
            setInstructors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchInstructors(), fetchDepartments()]);
        };
        loadData();
    }, []);

    const handleCreate = () => {
        setFormData({ name: '', email: '', phone: '', password: '', department: '', specialization: '', qualification: '', experience: '', basicSalary: '', status: 'active' });
        setSelectedInstructor(null);
        setShowModal(true);
    };

    const handleEdit = (instructor) => {
        setFormData({
            name: instructor.name || '',
            email: instructor.email || '',
            phone: instructor.phone || '',
            password: '',
            department: instructor.department || '',
            specialization: instructor.specialization || '',
            qualification: instructor.qualification || '',
            experience: instructor.experience || '',
            basicSalary: instructor.basicSalary || '',
            status: instructor.status || 'active'
        });
        setSelectedInstructor(instructor);
        setShowModal(true);
    };

    const handleView = (instructor) => {
        setSelectedInstructor(instructor);
        setShowViewModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const token = getAuthToken();
            const isEdit = !!selectedInstructor;
            const url = isEdit ? `${API_BASE_URL}/instructor/instructors/${selectedInstructor.id}` : `${API_BASE_URL}/instructor/create`;
            
            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save instructor');
            await fetchInstructors();
            setShowModal(false);
            alert(isEdit ? 'Updated successfully!' : 'Created successfully!');
        } catch (error) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (instructorId) => {
        if (!window.confirm('Delete this instructor?')) return;
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/instructor/instructors/${instructorId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Delete failed');
            await fetchInstructors();
            alert('Deleted successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    const filteredInstructors = instructors.filter(i =>
        i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50 pb-10">
                {/* Responsive Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                    <div className="px-4 py-4 md:px-6">
                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-2.5 rounded-xl shadow-lg">
                                    <FaUserTie className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Instructors</h1>
                                    <p className="text-xs md:text-sm text-gray-500">Branch Faculty Management</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCreate}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
                            >
                                <FaPlus className="w-4 h-4" />
                                <span className="font-semibold text-sm">Add Instructor</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
                    {/* Search and Stats Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Search Bar */}
                        <div className="lg:col-span-2">
                            <div className="relative group">
                                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or specialization..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Quick Stat (Desktop only visual) */}
                        <div className="hidden lg:flex items-center justify-end">
                            <div className="px-6 py-3 bg-orange-50 border border-orange-100 rounded-2xl">
                                <span className="text-orange-600 font-bold text-lg">{filteredInstructors.length}</span>
                                <span className="text-orange-800 text-sm ml-2 font-medium uppercase tracking-wider">Faculty Members</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards - Grid System */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Total Staff" value={instructors.length} icon={<FaUserTie />} color="blue" />
                        <StatCard title="Active Now" value={instructors.filter(i => i.status === 'active').length} icon={<FaUserTie />} color="orange" />
                        <StatCard title="Skills" value={new Set(instructors.map(i => i.specialization).filter(Boolean)).size} icon={<FaIdCard />} color="purple" />
                        <StatCard title="Total Courses" value={instructors.reduce((sum, i) => sum + (i.courses_count || 0), 0)} icon={<FaDollarSign />} color="red" />
                    </div>

                    {/* Content Container */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-20 text-center">
                                <FaSpinner className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Fetching Faculty Data...</p>
                            </div>
                        ) : filteredInstructors.length === 0 ? (
                            <div className="p-20 text-center text-gray-500">
                                <FaUserTie className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                                <p className="text-xl font-bold text-gray-400">No Instructors Found</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table View - Hidden on Mobile */}
                                <div className="hidden xl:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-800 text-white">
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Faculty Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Contact Info</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Department</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Specialization</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredInstructors.map((instructor) => (
                                                <tr key={instructor.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-5 font-bold text-gray-900">{instructor.name}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-sm text-gray-600 flex flex-col space-y-1">
                                                            <span className="flex items-center gap-2"><FaEnvelope className="text-gray-400 w-3" />{instructor.email}</span>
                                                            <span className="flex items-center gap-2"><FaPhone className="text-gray-400 w-3" />{instructor.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm font-semibold text-blue-600">{instructor.department || 'N/A'}</td>
                                                    <td className="px-6 py-5">
                                                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-100">
                                                            {instructor.specialization || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <StatusBadge status={instructor.status} />
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex justify-center space-x-2">
                                                            <ActionBtn icon={<FaEye />} color="orange" onClick={() => handleView(instructor)} />
                                                            <ActionBtn icon={<FaEdit />} color="blue" onClick={() => handleEdit(instructor)} />
                                                            <ActionBtn icon={<FaTrash />} color="red" onClick={() => handleDelete(instructor.id)} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile/Tablet Card View - Hidden on Desktop */}
                                <div className="xl:hidden divide-y divide-gray-100">
                                    {filteredInstructors.map((instructor) => (
                                        <div key={instructor.id} className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xl font-bold uppercase">
                                                        {instructor.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{instructor.name}</h3>
                                                        <p className="text-xs text-blue-600 font-bold uppercase tracking-tighter">{instructor.department}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={instructor.status} />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div className="flex items-center gap-2 text-gray-600"><FaEnvelope className="text-blue-500" /> <span className="truncate">{instructor.email}</span></div>
                                                <div className="flex items-center gap-2 text-gray-600"><FaPhone className="text-green-500" /> {instructor.phone}</div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                                <button onClick={() => handleView(instructor)} className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center gap-2 font-bold text-xs"><FaEye /> Details</button>
                                                <button onClick={() => handleEdit(instructor)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2 font-bold text-xs"><FaEdit /> Edit</button>
                                                <button onClick={() => handleDelete(instructor.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><FaTrash /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Shared Modal Logic (Responsive Scaling) */}
                {(showModal || showViewModal) && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="px-6 py-5 bg-gradient-to-r from-gray-800 to-gray-900 text-white flex items-center justify-between shrink-0">
                                <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                                    {showViewModal ? 'Profile Review' : (selectedInstructor ? 'Update Instructor' : 'Add New Faculty')}
                                </h3>
                                <button onClick={() => { setShowModal(false); setShowViewModal(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FaTimes /></button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                {showViewModal ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <ViewItem label="Full Name" value={selectedInstructor?.name} icon={<FaUserTie />} />
                                        <ViewItem label="Contact Email" value={selectedInstructor?.email} icon={<FaEnvelope />} />
                                        <ViewItem label="Phone Number" value={selectedInstructor?.phone} icon={<FaPhone />} />
                                        <ViewItem label="Salary (Base)" value={`₹${selectedInstructor?.basicSalary}/-`} icon={<FaDollarSign />} />
                                        <ViewItem label="Academic Status" value={selectedInstructor?.status} isBadge />
                                        <ViewItem label="Qualification" value={selectedInstructor?.qualification} icon={<FaGraduationCap />} />
                                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                                            <h4 className="text-xs font-black text-gray-400 uppercase mb-2">Subject Specialization</h4>
                                            <p className="text-gray-900 font-bold text-xl">{selectedInstructor?.specialization}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input label="Full Name *" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                            <Input label="Email Address *" type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                            <Input label="Phone Number *" name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                                            {!selectedInstructor && <Input label="Password *" type="password" name="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />}
                                            <Select label="Department *" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} options={departments} required />
                                            <Select label="Specialization *" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} options={specializations} required />
                                            <Input label="Salary (INR) *" type="number" value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: e.target.value})} required />
                                            <Select label="Account Status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} options={['active', 'inactive']} />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                                            <button type="submit" disabled={submitting} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2">
                                                {submitting ? <FaSpinner className="animate-spin" /> : <FaPlus />} {selectedInstructor ? 'Update Profile' : 'Register Instructor'}
                                            </button>
                                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold border border-gray-200 hover:bg-gray-100 transition-all">Cancel</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BranchLayout>
    );
};

// --- Reusable Sub-components ---

const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        red: 'bg-red-50 text-red-600 border-red-100'
    };
    return (
        <div className={`p-6 rounded-3xl border flex items-center justify-between ${colors[color]} shadow-sm`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{title}</p>
                <p className="text-3xl font-black">{value}</p>
            </div>
            <div className="text-3xl opacity-20">{icon}</div>
        </div>
    );
};

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {status}
    </span>
);

const ActionBtn = ({ icon, color, onClick }) => {
    const colors = {
        orange: 'text-orange-500 hover:bg-orange-50',
        blue: 'text-blue-500 hover:bg-blue-50',
        red: 'text-red-500 hover:bg-red-50'
    };
    return (
        <button onClick={onClick} className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${colors[color]}`}>{icon}</button>
    );
};

const ViewItem = ({ label, value, icon, isBadge }) => (
    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
            {!isBadge && <span className="text-gray-400">{icon}</span>}
            {isBadge ? <StatusBadge status={value} /> : <span className="font-bold text-gray-800 truncate">{value || 'N/A'}</span>}
        </div>
    </div>
);

const Input = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <input {...props} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium" />
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
        <select {...props} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium">
            <option value="">Choose Option</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default BranchInstructors;