import { useState, useEffect } from 'react';
import { liveSessionService } from '../../services/liveSessionService';
import { branchCourseService } from '../../services/branchCourseService';
import { FaPlus, FaTrash, FaVideo, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import BranchLayout from '../Branch/BranchLayout';

const LiveClasses = () => {
    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        course_id: '',
        scheduled_time: '',
        status: 'scheduled'
    });

    useEffect(() => {
        fetchSessions();
        fetchCourses();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await liveSessionService.getLiveSessions();
            setSessions(data);
        } catch (error) {
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await branchCourseService.getCourses();
            if (response.success) {
                setCourses(response.data || []);
            } else {
                console.error("Failed to load courses", response.error);
                setCourses([]);
            }
        } catch (error) {
            console.error("Failed to load courses", error);
            setCourses([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting Live Session:", form);
        try {
            await liveSessionService.createLiveSession({
                ...form,
                scheduled_time: new Date(form.scheduled_time).toISOString()
            });
            toast.success('Session created successfully');
            setIsModalOpen(false);
            fetchSessions();
        } catch (error) {
            console.error("Submission Error:", error);
            toast.error(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await liveSessionService.deleteLiveSession(id);
            toast.success('Deleted');
            fetchSessions();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-lg">
                                    <FaVideo className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Live Classes Management</h1>
                                    <p className="text-sm text-gray-600 mt-1">Create and manage live sessions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-md"
                            >
                                <FaPlus /> Create Live Session
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Course</th>
                                    <th className="p-4 font-semibold text-gray-600">Scheduled Time</th>
                                    <th className="p-4 font-semibold text-gray-600">Channel Name</th>
                                    <th className="p-4 font-semibold text-gray-600">Status</th>
                                    <th className="p-4 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : sessions.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">No scheduled sessions found</td></tr>
                                ) : (
                                    sessions.map(session => (
                                        <tr key={session.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-medium text-gray-800">{session.course_title}</td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <FaCalendarAlt className="text-gray-400" />
                                                    {moment.utc(session.scheduled_time).local().format('MMM D, YYYY h:mm A')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 font-mono text-sm bg-gray-50 px-2 py-1 rounded inline-block mt-2">
                                                {session.channel_name}
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={session.status}
                                                    onChange={async (e) => {
                                                        try {
                                                            await liveSessionService.updateSessionStatus(session.id, e.target.value);
                                                            toast.success(`Status updated to ${e.target.value}`);
                                                            fetchSessions();
                                                        } catch (err) {
                                                            toast.error('Failed to update status');
                                                        }
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none cursor-pointer ${session.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
                                                        session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}
                                                >
                                                    <option value="scheduled">Scheduled</option>
                                                    <option value="live">Live Now</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleDelete(session.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                                <h2 className="text-xl font-bold mb-4">Schedule Live Class</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                                        <select
                                            required
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={form.course_id}
                                            onChange={e => setForm({ ...form, course_id: e.target.value })}
                                        >
                                            <option value="">-- Select Course --</option>
                                            {courses.map(course => (
                                                <option key={course.id || course._id} value={course.id || course._id}>
                                                    {course.course_name || course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={form.scheduled_time}
                                            onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Schedule Session
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BranchLayout>
    );
};

export default LiveClasses;
