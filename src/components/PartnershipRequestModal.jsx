import React, { useState } from 'react';
import { submitPartnershipRequest } from '../api/partnershipApi';

const initialForm = {
	organizationName: '',
	organizationType: '',
	website: '',
	contactName: '',
	designation: '',
	email: '',
	phone: '',
	collaborationAreas: [],
	message: '',
	agreedToContact: false,
	franchiseQuery: '',
};

const collaborationOptions = [
	'Communication Training',
	'Leadership Development',
	'Pedagogy / Teaching Excellence',
	'Professional Development',
	'Student Exchange',
	'Research & Innovation',
];

const PartnershipRequestModal = ({ isOpen, onClose }) => {
	const [form, setForm] = useState(initialForm);
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	if (!isOpen) return null;

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		if (name === 'collaborationAreas') {
			setForm((prev) => {
				if (checked) {
					return { ...prev, collaborationAreas: [...prev.collaborationAreas, value] };
				} else {
					return { ...prev, collaborationAreas: prev.collaborationAreas.filter((v) => v !== value) };
				}
			});
		} else if (type === 'checkbox') {
			setForm((prev) => ({ ...prev, [name]: checked }));
		} else {
			setForm((prev) => ({ ...prev, [name]: value }));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			await submitPartnershipRequest(form);
			setSubmitted(true);
		} catch (err) {
			setError('Failed to submit request. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setForm(initialForm);
		setSubmitted(false);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
			<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
				<button
					onClick={handleClose}
					className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700 font-bold"
				>
					×
				</button>
				<div className="bg-[#2e5288] text-white p-6 rounded-t-lg">
					<h2 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
						Partnership Request
					</h2>
					<p className="mt-2 text-white/90">
						Join our global network of educational partners and unlock new opportunities for collaboration.
					</p>
				</div>
				<div className="p-6">
					{error && (
						<div className="mb-4 text-red-600 font-semibold text-center">{error}</div>
					)}
					{submitted ? (
						<div className="text-center py-12">
							<div className="mb-6">
								<svg className="mx-auto h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold text-[#2e5288] mb-4">Thank You!</h3>
							<p className="text-gray-700 text-lg">
								Thank you for reaching out! Our partnerships team will contact you within 2–3 business days.
							</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-8">
														{/* Franchise Queries Section */}
														<div>
															<h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
																Franchise Queries (Optional)
															</h3>
															<label className="block text-sm font-semibold text-gray-700 mb-2">
																If you have any specific queries or comments regarding SkillWallah franchise opportunities, please mention them below:
															</label>
															<textarea
																name="franchiseQuery"
																value={form.franchiseQuery}
																onChange={handleChange}
																rows="3"
																placeholder="Your franchise-related questions or comments..."
																className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg resize-y focus:ring-0 focus:outline-none"
															></textarea>
														</div>
							{/* Organization Details */}
							<div>
								<h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
									1. Organization Details
								</h3>
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Organization Name *
										</label>
										<input
											type="text"
											name="organizationName"
											value={form.organizationName}
											onChange={handleChange}
											placeholder="ABC International School"
											required
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Type of Organization *
										</label>
										<select
											name="organizationType"
											value={form.organizationType}
											onChange={handleChange}
											required
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										>
											<option value="">Select type...</option>
											<option value="School">School</option>
											<option value="University">University</option>
											<option value="Corporation">Corporation</option>
											<option value="NGO">NGO</option>
											<option value="Franchise">Franchise</option>

										</select>
									</div>
									<div className="md:col-span-2">
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Website / Social Media Link (Optional)
										</label>
										<input
											type="url"
											name="website"
											value={form.website}
											onChange={handleChange}
											placeholder="https://www.yourorganization.com"
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
								</div>
							</div>
							{/* Contact Person Information */}
							<div>
								<h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
									2. Contact Person Information
								</h3>
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Full Name *
										</label>
										<input
											type="text"
											name="contactName"
											value={form.contactName}
											onChange={handleChange}
											placeholder="John Smith"
											required
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Designation / Role *
										</label>
										<input
											type="text"
											name="designation"
											value={form.designation}
											onChange={handleChange}
											placeholder="Principal, HR Director, Head of Training"
											required
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Email Address *
										</label>
										<input
											type="email"
											name="email"
											value={form.email}
											onChange={handleChange}
											placeholder="john.smith@organization.com"
											required
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Phone Number (Recommended)
										</label>
										<input
											type="tel"
											name="phone"
											value={form.phone}
											onChange={handleChange}
											placeholder="+44 20 1234 5678"
											className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
										/>
									</div>
								</div>
							</div>
							{/* Partnership Interest */}
							<div>
								<h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
									3. Partnership Interest
								</h3>
								<div className="mb-4">
									<label className="block text-sm font-semibold text-gray-700 mb-3">
										Area(s) of Collaboration (Select all that apply)
									</label>
									<div className="grid md:grid-cols-2 gap-3">
										{collaborationOptions.map((area) => (
											<label key={area} className="flex items-center space-x-3 cursor-pointer">
												<input
													type="checkbox"
													name="collaborationAreas"
													value={area}
													checked={form.collaborationAreas.includes(area)}
													onChange={handleChange}
													className="h-4 w-4 text-[#2e5288] focus:ring-[#2e5288] border-gray-300 rounded"
												/>
												<span className="text-gray-700">{area}</span>
											</label>
										))}
									</div>
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">
										Message / Proposal
									</label>
									<textarea
										name="message"
										value={form.message}
										onChange={handleChange}
										rows="4"
										placeholder="We'd like to collaborate on a leadership development program for educators..."
										className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg resize-y focus:ring-0 focus:outline-none"
									></textarea>
								</div>
							</div>
							{/* Agreement & Submission */}
							<div>
								<h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
									4. Agreement & Submission
								</h3>
								<div className="mb-6">
									<label className="flex items-start space-x-3 cursor-pointer">
										<input
											type="checkbox"
											name="agreedToContact"
											checked={form.agreedToContact}
											onChange={handleChange}
											required
											className="h-4 w-4 text-[#2e5288] focus:ring-[#2e5288] border-gray-300 rounded mt-1"
										/>
										<span className="text-gray-700">
											I agree to be contacted by the SWE Partnerships Team regarding this partnership request.
										</span>
									</label>
								</div>
								<div className="text-center">
									<button
										type="submit"
										disabled={!form.agreedToContact || loading}
										className={`px-8 py-3 rounded-lg font-semibold transition duration-300 ${
											form.agreedToContact && !loading
												? 'bg-[#2e5288] hover:bg-[#1e3c68] text-white'
												: 'bg-gray-300 text-gray-500 cursor-not-allowed'
										}`}
									>
										{loading ? 'Submitting...' : 'Submit Partnership Request'}
									</button>
								</div>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default PartnershipRequestModal;