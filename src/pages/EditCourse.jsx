import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';



const EditCourse = () => {
    const { id } = useParams();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        price: '',
    });

    useEffect(() => {
        // TODO: Replace with API call
        const mockData = {
            title: 'React Masterclass',
            description: 'Learn React from scratch.',
            category: 'web',
            price: 1499,
        };
        setFormData(mockData);
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Updated Course:', formData);
        alert('✅ Course Updated');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto bg-white shadow p-6 rounded-xl">
                <h2 className="text-2xl font-bold text-center mb-6">📝 Edit Course</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <input type="text" name="title" value={formData.title} onChange={handleChange}
                        placeholder="Course Title"
                        className="w-full border rounded px-3 py-2" />

                    <textarea name="description" value={formData.description} onChange={handleChange}
                        rows={4}
                        placeholder="Course Description"
                        className="w-full border rounded px-3 py-2" />

                    <select name="category" value={formData.category} onChange={handleChange}
                        className="w-full border rounded px-3 py-2">
                        <option value="">Select Category</option>
                        <option value="web">Web Dev</option>
                        <option value="ai">AI/ML</option>
                    </select>

                    <input type="number" name="price" value={formData.price} onChange={handleChange}
                        placeholder="Price (INR)"
                        className="w-full border rounded px-3 py-2" />

                    <button type="submit"
                        className="w-full bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white py-2 rounded shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200">
                        💾 Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditCourse;
