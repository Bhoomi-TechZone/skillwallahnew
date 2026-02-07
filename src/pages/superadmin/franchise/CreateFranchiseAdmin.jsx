import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaBuilding, FaUser, FaFileAlt, FaMapMarkerAlt, FaGlobe, FaDollarSign, FaUniversity, FaCalendarAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';

const CreateFranchiseAdmin = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect to the franchise list and open the inline create modal
  useEffect(() => {
    navigate('/superadmin/franchise-admins/all', { state: { openCreate: true } });
  }, []);

  const [formData, setFormData] = useState({
    // Franchise Information
    franchise_name: '',
    entity_type: 'Private Limited',
    legal_entity_name: '',

    // Owner Information
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    password: '',

    // Legal Documents
    pan_number: '',
    aadhaar_number: '',
    gstin: '',

    // Address Information
    state: '',
    city: '',
    full_address: '',
    pincode: '',

    // Territory Information
    territory_type: 'City',
    territory_value: '',

    // Financial Information
    franchise_fee: '',
    revenue_share_percent: '',

    // Bank Information
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',

    // Agreement Information
    agreement_start: '',
    agreement_end: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for phone number - only allow numbers and limit to 10 digits
    if (name === 'owner_phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mandatory fields (all fields are mandatory)
    const mandatoryFields = [
      'franchise_name', 'legal_entity_name', 'owner_name', 'owner_email', 'owner_phone',
      'password', 'pan_number', 'aadhaar_number', 'gstin', 'state', 'city', 'pincode', 'full_address',
      'territory_value', 'franchise_fee', 'revenue_share_percent', 'bank_name',
      'account_holder_name', 'account_number', 'ifsc_code', 'agreement_start', 'agreement_end'
    ];

    const emptyFields = mandatoryFields.filter(field => !formData[field]?.trim());
    if (emptyFields.length > 0) {
      alert(`Please fill in all mandatory fields: ${emptyFields.join(', ')}`);
      return;
    }

    // Validate phone number format (numeric, exactly 10 digits)
    if (!/^\d{10}$/.test(formData.owner_phone)) {
      alert('Phone number must be exactly 10 numeric digits');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.owner_email)) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Prepare payload to match your API structure
      const payload = {
        // Franchise Information
        franchise_name: formData.franchise_name,
        entity_type: formData.entity_type,
        legal_entity_name: formData.legal_entity_name,

        // Owner Information
        owner_name: formData.owner_name,
        owner_email: formData.owner_email,
        owner_phone: formData.owner_phone,
        password: formData.password,

        // Legal Documents
        pan_number: formData.pan_number,
        aadhaar_number: formData.aadhaar_number,
        gstin: formData.gstin,

        // Address Information
        state: formData.state,
        city: formData.city,
        full_address: formData.full_address,
        pincode: formData.pincode,

        // Territory Information
        territory_type: formData.territory_type,
        territory_value: formData.territory_value,

        // Financial Information
        franchise_fee: parseFloat(formData.franchise_fee),
        revenue_share_percent: parseFloat(formData.revenue_share_percent),

        // Bank Information
        bank_name: formData.bank_name,
        account_holder_name: formData.account_holder_name,
        account_number: formData.account_number,
        ifsc_code: formData.ifsc_code,

        // Agreement Information
        agreement_start: formData.agreement_start,
        agreement_end: formData.agreement_end
      };

      const response = await fetch('http://localhost:4000/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Temporarily removed Authorization header for testing
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();

        // Create franchise data object matching the structure you provided
        const franchiseData = {
          _id: data._id || data.id,
          franchise_code: data.franchise_code,
          franchise_name: data.franchise_name,
          entity_type: data.entity_type,
          legal_entity_name: data.legal_entity_name,
          status: data.status,
          owner: {
            name: formData.owner_name,
            email: formData.owner_email,
            phone: formData.owner_phone,
            password: formData.password
          },
          documents: {
            pan_number: formData.pan_number,
            aadhaar_number: formData.aadhaar_number,
            gstin: formData.gstin
          },
          address: {
            city: formData.city,
            state: formData.state,
            full_address: formData.full_address,
            pincode: formData.pincode
          },
          territory: {
            type: formData.territory_type,
            value: formData.territory_value
          },
          financial: {
            franchise_fee: parseFloat(formData.franchise_fee),
            revenue_share_percent: parseFloat(formData.revenue_share_percent)
          },
          bank: {
            bank_name: formData.bank_name,
            account_holder_name: formData.account_holder_name,
            account_number: formData.account_number,
            ifsc_code: formData.ifsc_code
          },
          agreement: {
            start: formData.agreement_start,
            end: formData.agreement_end
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('🎉 Franchise created successfully:', franchiseData);

        // Trigger franchise owner auto-login event
        const franchiseCreatedEvent = new CustomEvent('franchiseCreated', {
          detail: { franchiseData }
        });
        window.dispatchEvent(franchiseCreatedEvent);

        // Show success message with login details
        alert(`✅ Franchise Created Successfully!\\n\\n📋 Details:\\nFranchise: ${data.franchise_name}\\nCode: ${data.franchise_code}\\nStatus: ${data.status}\\n\\n👤 Owner Login Details:\\nEmail: ${formData.owner_email}\\nPassword: ${formData.password}\\n\\n🚀 Auto-opening Admin Dashboard...`);

        // Tell the list page to refresh when we navigate back
        setTimeout(() => {
          navigate('/superadmin/franchise-admins/all', { state: { refresh: true } });
        }, 2000);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || errorData.message || 'Failed to create franchise'}`);
      }
    } catch (error) {
      console.error('Error creating franchise:', error);
      alert('Error creating franchise. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const entityTypes = ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship', 'OPC'];
  const territoryTypes = ['City', 'State', 'Region', 'District'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 relative">
      {/* Sidebar */}
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Create Franchise Admin"
      />

      {/* Main Content */}
      <div className="min-h-screen flex flex-col overflow-hidden ml-0 lg:ml-72">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-amber-200/50 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/superadmin/franchise-admins/all')}
                  className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-amber-900">Create Franchise Admin</h1>
                  <p className="text-sm text-amber-700/70">Add new franchise administrator to the system</p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <FaSave />
                <span>{loading ? 'Creating...' : 'Create Admin'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Form Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-8">

            {/* Franchise Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FaBuilding className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Franchise Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Franchise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="franchise_name"
                    value={formData.franchise_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="SkillWallah Delhi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="entity_type"
                    value={formData.entity_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  >
                    {entityTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Legal Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="legal_entity_name"
                    value={formData.legal_entity_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="SkillWallah Delhi Pvt Ltd"
                  />
                </div>
              </div>
            </div>

            {/* Owner Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <FaUser className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Owner Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="rahul@skillwallah.in"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="owner_phone"
                    value={formData.owner_phone}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{10}"
                    maxLength="10"
                    minLength="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="(10 digits)"
                    title="Please enter exactly 10 digits"
                  />
                  {formData.owner_phone && formData.owner_phone.length < 10 && (
                    <p className="text-red-500 text-xs mt-1">Phone number must be 10 digits</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Documents Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <FaFileAlt className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Legal Documents</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors uppercase"
                    placeholder="ABCDE1234F"
                    maxLength="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Aadhaar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="aadhaar_number"
                    value={formData.aadhaar_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="123412341234"
                    maxLength="12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GSTIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors uppercase"
                    placeholder="07ABCDE1234F1Z5"
                    maxLength="15"
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <FaMapMarkerAlt className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Address Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Delhi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="New Delhi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="110001"
                    maxLength="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="full_address"
                  value={formData.full_address}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  placeholder="Connaught Place, Delhi"
                />
              </div>
            </div>

            {/* Territory Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <FaGlobe className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Territory Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Territory Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="territory_type"
                    value={formData.territory_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  >
                    {territoryTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Territory Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="territory_value"
                    value={formData.territory_value}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="New Delhi"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <FaDollarSign className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Financial Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Franchise Fee (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="franchise_fee"
                    value={formData.franchise_fee}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="250000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Revenue Share (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="revenue_share_percent"
                    value={formData.revenue_share_percent}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            {/* Bank Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <FaUniversity className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Bank Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="SkillWallah Delhi Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors uppercase"
                    placeholder="HDFC0001234"
                    maxLength="11"
                  />
                </div>
              </div>
            </div>

            {/* Agreement Information Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Agreement Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Agreement Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="agreement_start"
                    value={formData.agreement_start}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Agreement End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="agreement_end"
                    value={formData.agreement_end}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/superadmin/franchise-admins/all')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <FaSave />
                <span>{loading ? 'Creating...' : 'Create Franchise Admin'}</span>
              </button>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateFranchiseAdmin;