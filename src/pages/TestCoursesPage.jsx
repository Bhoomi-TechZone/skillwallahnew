import { useNavigate } from 'react-router-dom';

const TestCoursesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          🚀 Test Courses Page
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          This is a test page to ensure routing is working properly.
        </p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-amber-600 mb-4">Page Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-100 text-orange-800 p-4 rounded-lg">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-semibold">Route Working</div>
            </div>
            <div className="bg-blue-100 text-blue-800 p-4 rounded-lg">
              <div className="text-2xl mb-2">🔗</div>
              <div className="font-semibold">Navigation OK</div>
            </div>
            <div className="bg-purple-100 text-purple-800 p-4 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold">Page Loaded</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full md:w-auto bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors mx-2"
          >
            🏠 Go Home
          </button>
          <button
            onClick={() => navigate('/courses-offer')}
            className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:blue-amber-700 transition-colors mx-2"
          >
            📚 Try Full Courses Page
          </button>
        </div>

        <div className="mt-12 text-gray-600">
          <p>If you can see this page, the routing is working correctly!</p>
          <p className="mt-2">Check the browser console for any errors.</p>
        </div>
      </div>
    </div>
  );
};

export default TestCoursesPage;