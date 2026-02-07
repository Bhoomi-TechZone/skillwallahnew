import { useState, useEffect } from 'react';
import { FaBuilding, FaPlus, FaTrash, FaToggleOn, FaToggleOff, FaSpinner, FaEdit, FaUsers, FaDollarSign, FaBars } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import departmentsApi from '../../../api/departmentsApi';

const BranchEmployeeDepartment = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        head: '',
        employees_count: 0,
        budget: 0
    });

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const data = await departmentsApi.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to load departments:', error);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
            try {
                if (editingDepartment) {
                    await departmentsApi.updateDepartment(editingDepartment.id, formData);
                } else {
                    await departmentsApi.createDepartment(formData);
                }
                await loadDepartments();
                resetForm();
            } catch (error) {
                console.error('Failed to save department:', error);
                alert(`Failed to ${editingDepartment ? 'update' : 'create'} department: ${error.message}`);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            head: '',
            employees_count: 0,
            budget: 0
        });
        setShowAddForm(false);
        setShowEditForm(false);
        setEditingDepartment(null);
    };

    const handleEditDepartment = (department) => {
        setEditingDepartment(department);
        setFormData({
            name: department.name,
            description: department.description || '',
            head: department.head || '',
            employees_count: department.employees_count || 0,
            budget: department.budget || 0
        });
        setShowEditForm(true);
        setShowAddForm(false);
    };

    const toggleStatus = async (department) => {
        try {
            await departmentsApi.toggleDepartmentStatus(department.id);
            await loadDepartments();
        } catch (error) {
            console.error('Failed to toggle status:', error);
            alert(`Failed to toggle status: ${error.message}`);
        }
    };

    const deleteDepartment = async (department) => {
        if (window.confirm(`Are you sure you want to delete "${department.name}" department?`)) {
            try {
                await departmentsApi.deleteDepartment(department.id);
                await loadDepartments();
            } catch (error) {
                console.error('Failed to delete:', error);
                alert(`Failed to delete department: ${error.message}`);
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'employees_count' || name === 'budget' ? Number(value) : value
        }));
    };

    if (loading) {
        return (
            <BranchLayout>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Loading departments...</p>
                    </div>
                </div>
            </BranchLayout>
        );
    }

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header Section */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-4 py-4 md:px-6">
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-2 rounded-lg shrink-0">
                                    <FaBuilding className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate tracking-tight uppercase">Instructor Departments</h1>
                                    <p className="text-sm text-gray-600 truncate">Manage and monitor branch departments</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddForm(true);
                                    setShowEditForm(false);
                                    setEditingDepartment(null);
                                }}
                                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
                            >
                                <FaPlus className="w-4 h-4" />
                                <span className="font-semibold text-sm">Add New Department</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 lg:p-8">
                    {/* Add/Edit Department Modal */}
                    {(showAddForm || showEditForm) && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                                <div className="p-6 md:p-8">
                                    <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                                        {editingDepartment ? 'Update Department' : 'Create New Department'}
                                    </h2>
                                    <form onSubmit={handleFormSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Department Name *</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="e.g. Computer Science"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Department Head</label>
                                                <input
                                                    type="text"
                                                    name="head"
                                                    value={formData.head}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="HOD Name"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="Brief department overview..."
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Employee Count</label>
                                                <input
                                                    type="number"
                                                    name="employees_count"
                                                    value={formData.employees_count}
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Budget (INR)</label>
                                                <input
                                                    type="number"
                                                    name="budget"
                                                    value={formData.budget}
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                            <button
                                                type="submit"
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                                            >
                                                {editingDepartment ? 'Save Changes' : 'Confirm & Add'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="flex-1 border border-gray-300 rounded-xl text-gray-600 font-bold py-3 hover:bg-gray-50 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments List Container */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                        {/* Desktop Table - Hidden on small screens */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">S.No.</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Department Name</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Department Head</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Employees</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Budget</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {departments.length > 0 && departments.map((dept, index) => (
                                        <tr key={dept.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-400">{index + 1}.</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{dept.name}</div>
                                                {dept.description && <div className="text-xs text-gray-400 line-clamp-1">{dept.description}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-700">{dept.head || 'Not assigned'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm font-bold text-gray-800">
                                                    <FaUsers className="text-gray-300 mr-2" /> {dept.employees_count || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm font-bold text-gray-800">
                                                    <FaDollarSign className="text-green-500 mr-1" /> {dept.budget?.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    dept.status === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {dept.status === 'active' ? <FaToggleOn className="mr-1" /> : <FaToggleOff className="mr-1" />}
                                                    {dept.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <button onClick={() => handleEditDepartment(dept)} className="text-blue-500 hover:text-blue-700 transition-transform hover:scale-110"><FaEdit size={18} /></button>
                                                    <button onClick={() => toggleStatus(dept)} className="text-orange-600 font-bold text-[10px] uppercase hover:underline">Toggle</button>
                                                    <button onClick={() => deleteDepartment(dept)} className="text-red-500 hover:text-red-700 transition-transform hover:scale-110"><FaTrash size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View - Cards based */}
                        <div className="lg:hidden divide-y divide-gray-100">
                            {departments.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <FaBuilding className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-bold">No departments available.</p>
                                </div>
                            ) : (
                                departments.map((dept, index) => (
                                    <div key={dept.id} className="p-4 bg-white space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-gray-300">#{index + 1}</span>
                                                    <h3 className="font-black text-gray-900 truncate uppercase">{dept.name}</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2">{dept.description || 'No description provided'}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                dept.status === 'active' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {dept.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Head</p>
                                                <p className="text-xs font-bold text-gray-700 truncate">{dept.head || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Staff</p>
                                                <p className="text-xs font-bold text-gray-700">{dept.employees_count || 0}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="text-xs font-black text-green-600">
                                                ₹ {dept.budget?.toLocaleString() || 0}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditDepartment(dept)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FaEdit size={16} /></button>
                                                <button onClick={() => toggleStatus(dept)} className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FaBars size={16} /></button>
                                                <button onClick={() => deleteDepartment(dept)} className="p-2 bg-red-50 text-red-600 rounded-lg"><FaTrash size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Summary Cards Grid - 1 col on mobile, 2 on tablet, 4 on desktop */}
                    {departments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Total</p>
                                        <p className="text-3xl font-black text-blue-900">{departments.length}</p>
                                    </div>
                                    <FaBuilding className="text-4xl text-blue-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Active</p>
                                        <p className="text-3xl font-black text-orange-900">
                                            {departments.filter(d => d.status === 'active').length}
                                        </p>
                                    </div>
                                    <FaToggleOn className="text-4xl text-orange-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Team Size</p>
                                        <p className="text-3xl font-black text-amber-900">
                                            {departments.reduce((sum, d) => sum + (d.employees_count || 0), 0)}
                                        </p>
                                    </div>
                                    <FaUsers className="text-4xl text-amber-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Total Budget</p>
                                        <p className="text-2xl md:text-3xl font-black text-purple-900 truncate">
                                            ₹ {departments.reduce((sum, d) => sum + (d.budget || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <FaDollarSign className="text-4xl text-purple-200" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Keyframe Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>
        </BranchLayout>
    );
};

export default BranchEmployeeDepartment;