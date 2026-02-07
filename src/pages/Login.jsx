import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute, storeAuthData } from '../utils/authUtils';
import { apiRequest } from '../config/api';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError(''); // Clear error when user types
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('Attempting login with:', form.email);
            
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password
                })
            });

            console.log('Login response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.log('Login error response:', errorData);
                throw new Error('Login failed. Please check your credentials.');
            }

            const data = await response.json();
            console.log('Login successful, received data:', data);

            // Store the token and user data using authUtils
            if (data.access_token) {
                // Use the storeAuthData function to properly store all auth data
                storeAuthData(data.access_token, data.user);
                console.log('Token stored in localStorage');
                
                // Get the user role and redirect to appropriate dashboard
                const userRole = data.user?.role;
                const dashboardRoute = getDashboardRoute(userRole);
                
                console.log(`User role: ${userRole}, redirecting to: ${dashboardRoute}`);
                
                // Navigate to role-specific dashboard
                navigate(dashboardRoute);
            } else {
                throw new Error('No access token received');
            }

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main">
            <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Login</h2>
                
                {error && (
                    <div style={{ 
                        color: 'red', 
                        backgroundColor: '#fee', 
                        padding: '10px', 
                        marginBottom: '20px', 
                        borderRadius: '4px',
                        border: '1px solid #fcc'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        name="email" 
                        value={form.email} 
                        onChange={handleChange} 
                        placeholder="Email" 
                        required 
                        disabled={loading}
                    />
                    <input 
                        type="password" 
                        name="password" 
                        value={form.password} 
                        onChange={handleChange} 
                        placeholder="Password" 
                        required 
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        className="btn" 
                        disabled={loading}
                        style={{ 
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                    <p>Test credentials:</p>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Student:</strong><br />
                        Email: student@test.com<br />
                        Password: password123
                    </div>
                    <div>
                        <strong>Instructor:</strong><br />
                        Email: instructor@test.com<br />
                        Password: password123
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
