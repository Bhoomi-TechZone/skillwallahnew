import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

// Critical components - loaded immediately
import ConditionalNavbar from "./components/ConditionalNavbar";
import StudentLayout from "./components/StudentLayout";
import Footer from "./components/Footer";
import Home from "./components/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./Layout";
import NotFound from "./components/NotFound";

// Import enhanced session manager
import sessionManager from "./utils/sessionManager";

// Import token integrity protection
import './utils/tokenIntegrity';

// Lazy load all other components for better performance
const AddInstructor = lazy(() => import("./components/AddInstructor"));
const StudentLogin = lazy(() => import("./components/StudentLogin"));
const InstructorLogin = lazy(() => import("./components/InstructorLogin"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const SuperAdminLogin = lazy(() => import("./components/SuperAdminLogin"));
const BranchLogin = lazy(() => import("./components/Branch/BranchLogin"));
const BranchDashboard = lazy(() => import("./components/Branch/BranchDashboard"));
const AdminDashboard = lazy(() => import("./components/Branch/AdminDashboard"));
const BranchWallet = lazy(() => import("./pages/Admin_Branch/BranchWallet"));
const BranchManagement = lazy(() => import("./pages/Admin_Branch/BranchManagement"));
const ManageUser = lazy(() => import("./components/Branch/ManageUser"));
const ManageUsers = lazy(() => import("./pages/Admin_Branch/ManageUsers"));
const ManageStudents = lazy(() => import("./pages/Admin_Branch/ManageStudents"));
const EmployeeDepartment = lazy(() => import("./pages/Admin_Branch/EmployeeDepartment"));
const EmployeeDepartments = lazy(() => import("./pages/Admin_Branch/EmployeeDepartment"));
const ManageStaff = lazy(() => import('./pages/Admin_Branch/ManageStaff'));
const ManageEmployee = lazy(() => import("./components/Branch/ManageEmployee"));
const AttendanceReport = lazy(() => import("./components/Branch/AttendanceReport"));
const AdvanceReport = lazy(() => import("./components/Branch/AdvanceReport"));
const StudentRegistration = lazy(() => import("./components/Branch/StudentRegistration"));
const BranchExpenseHead = lazy(() => import("./components/Branch/Income&Expense/BranchExpenseHead"));
const BranchExpenseReport = lazy(() => import("./components/Branch/Income&Expense/BranchExpenseReport"));
const BranchIncomeHead = lazy(() => import("./components/Branch/Income&Expense/BranchIncomeHead"));
const BranchIncomeReport = lazy(() => import("./components/Branch/Income&Expense/BranchIncomeReport"));
const ManageIncomeHeads = lazy(() => import("./pages/Admin_Branch/ManageIncomeHeads"));
const IncomeReport = lazy(() => import("./pages/Admin_Branch/IncomeReport"));
const ManageExpenseHeads = lazy(() => import("./pages/Admin_Branch/ManageExpenseHeads"));
const ExpenseReport = lazy(() => import("./pages/Admin_Branch/ExpenseReport"));
const StudentReport = lazy(() => import("./pages/Admin_Branch/StuedentReport"));
const FeeReport = lazy(() => import("./pages/Admin_Branch/FeeReport"));
const DuesFeeReport = lazy(() => import("./pages/Admin_Branch/DueFeeReport"));
const BalanceSheet = lazy(() => import("./pages/Admin_Branch/BalanceSheet"));
const GenerateSalary = lazy(() => import("./pages/Admin_Branch/GenerateSalary"));
const AdminIdCard = lazy(() => import("./components/Branch/Student/AdminIdCard"));
const AdminAdmitCard = lazy(() => import("./components/Branch/Student/AdminAdmitCard"));
const BranchIdCard = lazy(() => import("./components/Branch/Student/BranchIdCard"));
const BranchAdmitCard = lazy(() => import("./components/Branch/Student/BranchAdmitCard"));
const CourseManagement = lazy(() => import("./components/Branch/Courses/CourseManagement"));
const BranchCourses = lazy(() => import("./components/Branch/Courses/BranchCourses"));
const SubjectManagement = lazy(() => import("./components/Branch/Courses/SubjectManagement"));
const BranchSubject = lazy(() => import("./components/Branch/Courses/BranchSubject"));
const ProgramManagement = lazy(() => import("./components/Branch/Courses/ProgramManagement"));
const BranchProgram = lazy(() => import("./components/Branch/Courses/BranchProgram"));
const BatchManagement = lazy(() => import("./components/Branch/Courses/BatchManagement"));
const BranchBatch = lazy(() => import("./components/Branch/Courses/BranchBatch"));
const AdminCertificatesMarksheets = lazy(() => import("./components/Branch/Marksheet&Certificate/AdminCertificatesMarksheets"));
const BranchCertificatesMarksheets = lazy(() => import("./components/Branch/Marksheet&Certificate/AdminCertificatesMarksheets"));
// Online Exam components
const AdminPaperSet = lazy(() => import("./components/Branch/OnlineExam/AdminPaperSet"));
const BranchPaperSet = lazy(() => import("./components/Branch/OnlineExam/BranchPaperSet"));
const AdminQuestion = lazy(() => import("./components/Branch/OnlineExam/AdminQuestion"));
const BranchQuestion = lazy(() => import("./components/Branch/OnlineExam/BranchQuestion"));
const AdminResult = lazy(() => import("./components/Branch/OnlineExam/AdminResult"));
const BranchResult = lazy(() => import("./components/Branch/OnlineExam/BranchResult"));
// Instructor components
const BranchInstructors = lazy(() => import("./components/Branch/Instructors/BranchInstructors"));
const BranchEmployeeDepartment = lazy(() => import("./components/Branch/Instructors/BranchEmployeeDepartment"));
const BranchAdvanceReport = lazy(() => import("./components/Branch/Instructors/BranchAdvanceReport"));
const BranchGenerateSalary = lazy(() => import("./components/Branch/Instructors/BranchGenerateSalary"));
// Study Material components
const AdminMaterial = lazy(() => import("./components/Branch/StudyMaterial/AdminMaterial"));
const AdminSyllabus = lazy(() => import("./components/Branch/StudyMaterial/AdminSyllabus"));
const AdminVideoClass = lazy(() => import("./components/Branch/StudyMaterial/AdminVideoComponent"));
const BranchMaterial = lazy(() => import("./components/Branch/StudyMaterial/BranchMaterial"));
const BranchSyllabus = lazy(() => import("./components/Branch/StudyMaterial/BranchSyllabus"));
const BranchVideoClass = lazy(() => import("./components/Branch/StudyMaterial/BranchVideoClass"));
const ContactUs = lazy(() => import("./components/ContactUs"));
const Courses = lazy(() => import("./components/Courses"));
const DashboardRedirect = lazy(() => import("./components/DashboardRedirect"));
const DashboardSelector = lazy(() => import("./components/DashboardSelector"));
const RoleBasedLogin = lazy(() => import("./components/RoleBasedLogin"));

// Lazy load pages
const AboutUs = lazy(() => import("./pages/AboutUs"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseContentViewer = lazy(() => import("./pages/CourseContentViewer"));
const Collaboration = lazy(() => import("./pages/Collaboration"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const WeCourseOffer = lazy(() => import("./pages/WeCourseOffer"));
const BrowseAllCourses = lazy(() => import("./pages/BrowseAllCourses"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailsPage = lazy(() => import("./pages/CourseDetailsPage"));
const TestCoursesPage = lazy(() => import("./pages/TestCoursesPage"));
const AssignmentList = lazy(() => import("./pages/Assignments/AssignmentList"));
const CreateAssignment = lazy(() => import("./pages/Assignments/CreateAssignment"));
const ReviewAssignment = lazy(() => import("./pages/Assignments/ReviewAssignment"));
const SubmitAssignment = lazy(() => import("./pages/Assignments/SubmitAssignment"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const BrowseCourse = lazy(() => import("./pages/BrowseCourse"));
const CertificateEditor = lazy(() => import("./pages/CertificateEditor"));
const CertificatePage = lazy(() => import("./pages/CertificatePage"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Check = lazy(() => import("./pages/Check"));
const CourseCategory = lazy(() => import("./pages/CourseCategory"));
const CreateCourse = lazy(() => import("./pages/CreateCourse"));
const CreateCoursePage = lazy(() => import("./components/CreateCoursePage"));
const TestCreateCourse = lazy(() => import("./components/TestCreateCourse"));
const SuperAdminRoute = lazy(() => import("./components/SuperAdminRoute"));
const EditCoursePage = lazy(() => import("./components/EditCoursePage"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Lesson = lazy(() => import("./pages/Lesson"));
// Dashboard lazy imports
const InstructorDashboard = lazy(() => import("./pages/instructor/InstructorDashboard"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const NewStudentDashboard = lazy(() => import("./pages/student/NewStudentDashboard"));
const StudentTestAttempt = lazy(() => import("./pages/student/StudentTestAttempt"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));

// Quiz lazy imports
const CreateQuiz = lazy(() => import("./pages/Quiz/CreateQuiz"));
const QuizList = lazy(() => import("./pages/Quiz/QuizList"));
const QuizResult = lazy(() => import("./pages/Quiz/QuizResult"));
const TakeQuiz = lazy(() => import("./pages/Quiz/TakeQuiz"));
const StudentQuizzes = lazy(() => import("./pages/student/StudentQuizzes"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Settings = lazy(() => import("./pages/Settings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

// Test components - only load when needed
const AuthDebugPanel = lazy(() => import("./components/AuthDebugPanel"));

// SuperAdmin lazy imports
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));

// B2B Section

// Franchise Section (only existing files)

// Franchise Admin Management
const CreateFranchiseAdmin = lazy(() => import("./pages/superadmin/franchise/CreateFranchiseAdmin"));
const AllFranchiseAdmins = lazy(() => import("./pages/superadmin/franchise/AllFranchiseAdmins"));

// Admin Management Section (only existing files)





// Course Section









// Finance Section (only existing files)
const TransactionHistory = lazy(() => import("./pages/superadmin/TransactionHistory"));









// New SuperAdmin CRM Dashboard Components
const AllUsers = lazy(() => import("./pages/superadmin/users/AllUsers"));
const AdminUsers = lazy(() => import("./pages/superadmin/users/AdminUsers"));
const InstructorsPage = lazy(() => import("./pages/superadmin/users/InstructorsPage"));
const StudentsPage = lazy(() => import("./pages/superadmin/users/StudentsPage"));
const AssignmentsAndSubmissions = lazy(() => import("./pages/superadmin/learning/AssignmentsAndSubmissions"));
const PaymentDashboard = lazy(() => import("./pages/superadmin/payments/PaymentDashboard"));
const AdminDashboardAnalytics = lazy(() => import("./pages/superadmin/analytics/AdminDashboardAnalytics"));
const FranchiseEnquiries = lazy(() => import("./pages/superadmin/system/FranchiseEnquiries"));
const Partnerships = lazy(() => import("./pages/Partnerships"));
const AllEnquiries = lazy(() => import("./pages/superadmin/system/AllEnquiries"));
const AllCourses = lazy(() => import("./pages/superadmin/courses/AllCourses"));

// Franchise Agreement Pages (only existing files)
const GenerateAgreement = lazy(() => import("./pages/superadmin/franchise/agreements/GenerateAgreement"));
const UploadApprove = lazy(() => import("./pages/superadmin/franchise/agreements/UploadApprove"));

// Ledger & Settlement Pages (existing files)
const LedgerDashboard = lazy(() => import("./pages/superadmin/ledger/LedgerDashboard"));
const Settlements = lazy(() => import("./pages/superadmin/ledger/Settlements"));
const Transactions = lazy(() => import("./pages/superadmin/ledger/Transactions"));
const SuperAdminMaterials = lazy(() => import("./pages/superadmin/SuperAdminMaterials"));
const SuperAdminPrograms = lazy(() => import("./pages/superadmin/materials/SuperAdminPrograms"));
const SuperAdminCourses = lazy(() => import("./pages/superadmin/materials/SuperAdminCourses"));
const SuperAdminSubjects = lazy(() => import("./pages/superadmin/materials/SuperAdminSubjects"));
const SuperAdminBatches = lazy(() => import("./pages/superadmin/materials/SuperAdminBatches"));
const SuperAdminSyllabus = lazy(() => import("./pages/superadmin/materials/SuperAdminSyllabus"));
const SuperAdminStudyMaterials = lazy(() => import("./pages/superadmin/materials/SuperAdminStudyMaterials"));

// Loading component for better UX during code splitting
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-[#988913] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// Component to conditionally render footer
const ConditionalFooter = () => {
  const location = useLocation();
  const hideFooterPaths = [
    '/admin', '/auth', '/login', '/register', '/role-login', '/admin-improved', '/instructor', '/instructor',
    '/students', '/students-improved', '/course-content', '/superadmin', '/branch', '/Branch',
    '/student/test', '/student/test-result'
  ];
  // Check if current path starts with any of the hide footer paths
  const shouldHideFooter = hideFooterPaths.some(path =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  );
  if (shouldHideFooter) {
    return null;
  }
  return <Footer />;
};

// Session Manager Initializer Component
const SessionManagerWrapper = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize enhanced session manager
    const cleanup = sessionManager.init(navigate);

    return () => {
      if (cleanup && cleanup.destroy) {
        cleanup.destroy();
      }
    };
  }, [navigate]);

  return children;
};

const App = () => {
  return (
    <>
      <BrowserRouter>
        <SessionManagerWrapper>
          <ConditionalNavbar />
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route path="/dashboard-selector" element={<ProtectedRoute><DashboardSelector /></ProtectedRoute>} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/role-login" element={<RoleBasedLogin />} />
                <Route path="/student-login" element={<StudentLogin />} />
                <Route path="/instructor-login" element={<InstructorLogin />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/branch-login" element={<BranchLogin />} />
                <Route path="/super-admin-login" element={<SuperAdminLogin />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/Submit-Assign" element={<SubmitAssignment />} />
                <Route path="/take-quiz" element={<TakeQuiz />} />
                <Route path="/student/quizzes" element={<ProtectedRoute><StudentQuizzes /></ProtectedRoute>} />
                <Route path="/list" element={<QuizList />} />
                <Route path="/result" element={<QuizResult />} />
                <Route path="/create" element={<CreateQuiz />} />
                <Route path="/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
                <Route path="/createcourse" element={<ProtectedRoute><CreateCourse /></ProtectedRoute>} />
                <Route path="/grades" element={<ProtectedRoute><ReviewAssignment /></ProtectedRoute>} />
                <Route path="/assignment-list" element={<ProtectedRoute><AssignmentList /></ProtectedRoute>} />
                <Route path="/create-assignment" element={<ProtectedRoute><CreateAssignment /></ProtectedRoute>} />
                <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                <Route path="/browse" element={<BrowseCourse />} />
                <Route path="/category" element={<CourseCategory />} />
                <Route path="/course/:id" element={<CourseDetail />} />
                <Route path="/course/:courseId" element={<CourseDetails />} />
                <Route path="/course-content/:courseId" element={<ProtectedRoute><CourseContentViewer /></ProtectedRoute>} />
                <Route path="/payment-success/:courseId" element={<PaymentSuccess />} />
                <Route path="/my-certificate" element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
                <Route path="/certificate" element={<ProtectedRoute><CertificateEditor /></ProtectedRoute>} />
                <Route path="/students" element={<RoleBasedRoute allowedRoles={['student']}><NewStudentDashboard /></RoleBasedRoute>} />
                <Route path="/students-old" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <StudentLayout>
                      <StudentDashboard />
                    </StudentLayout>
                  </RoleBasedRoute>
                } />
                <Route path="/student/test/:testId" element={<RoleBasedRoute allowedRoles={['student']}><StudentLayout><StudentTestAttempt /></StudentLayout></RoleBasedRoute>} />
                <Route path="/student/test-result/:subjectName" element={<RoleBasedRoute allowedRoles={['student']}><NewStudentDashboard /></RoleBasedRoute>} />
                <Route path="/instructor" element={<RoleBasedRoute allowedRoles={['instructor']}><InstructorDashboard /></RoleBasedRoute>} />
                <Route path="/branch/dashboard" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchDashboard /></RoleBasedRoute>} />
                <Route path="/branch/admin-dashboard" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminDashboard /></RoleBasedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin/branches" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><BranchManagement /></RoleBasedRoute>} />

                {/* Branch Routes */}
                <Route path="/Branch/Wallet" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchWallet /></RoleBasedRoute>} />
                <Route path="/Branch/ManageUsers" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><ManageUsers /></RoleBasedRoute>} />
                <Route path="/Branch/ManageStudents" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><ManageStudents /></RoleBasedRoute>} />
                <Route path="/branch/users" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><ManageUser /></RoleBasedRoute>} />
                <Route path="/branch/staff/departments" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><EmployeeDepartments /></RoleBasedRoute>} />
                <Route path="/branch/staff/manage" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><ManageStaff /></RoleBasedRoute>} />
                <Route path="/branch/staff/employees" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><ManageEmployee /></RoleBasedRoute>} />
                <Route path="/branch/staff/attendance" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><AttendanceReport /></RoleBasedRoute>} />
                <Route path="/branch/staff/advance-report" element={<RoleBasedRoute allowedRoles={['branch', 'admin']}><AdvanceReport /></RoleBasedRoute>} />
                <Route path="/branch/staff/salary" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><GenerateSalary /></RoleBasedRoute>} />

                {/* Instructor Routes - Using instructor-specific components for branch_admin */}
                <Route path="/branch/instructors/departments" element={<RoleBasedRoute allowedRoles={['branch_admin', 'admin']}><BranchEmployeeDepartment /></RoleBasedRoute>} />
                <Route path="/branch/instructors/manage" element={<RoleBasedRoute allowedRoles={['branch_admin', 'admin']}><BranchInstructors /></RoleBasedRoute>} />
                <Route path="/branch/instructors/attendance" element={<RoleBasedRoute allowedRoles={['branch_admin', 'admin']}><AttendanceReport /></RoleBasedRoute>} />
                <Route path="/branch/instructors/advance-report" element={<RoleBasedRoute allowedRoles={['branch_admin', 'admin']}><BranchAdvanceReport /></RoleBasedRoute>} />
                <Route path="/branch/instructors/salary" element={<RoleBasedRoute allowedRoles={['branch_admin', 'admin']}><BranchGenerateSalary /></RoleBasedRoute>} />

                {/* Study Material Routes - Role-based routing */}
                <Route path="/branch/study-materials/admin-materials" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminMaterial /></RoleBasedRoute>} />
                <Route path="/branch/study-materials/admin-syllabus" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminSyllabus /></RoleBasedRoute>} />
                <Route path="/branch/study-materials/admin-videos" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminVideoClass /></RoleBasedRoute>} />
                <Route path="/branch/study-materials/materials" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchMaterial /></RoleBasedRoute>} />
                <Route path="/branch/study-materials/syllabus" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchSyllabus /></RoleBasedRoute>} />
                <Route path="/branch/study-materials/videos" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchVideoClass /></RoleBasedRoute>} />

                {/* Income & Expense Routes - Admin (Franchise) */}
                <Route path="/admin/incomes/heads" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><ManageIncomeHeads /></RoleBasedRoute>} />
                <Route path="/admin/incomes/report" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><IncomeReport /></RoleBasedRoute>} />
                <Route path="/admin/expenses/heads" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><ManageExpenseHeads /></RoleBasedRoute>} />
                <Route path="/admin/expenses/report" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><ExpenseReport /></RoleBasedRoute>} />

                {/* Income & Expense Routes - Branch */}
                <Route path="/branch/incomes/heads" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchIncomeHead /></RoleBasedRoute>} />
                <Route path="/branch/incomes/report" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchIncomeReport /></RoleBasedRoute>} />
                <Route path="/branch/expenses/heads" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchExpenseHead /></RoleBasedRoute>} />
                <Route path="/branch/expenses/report" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BranchExpenseReport /></RoleBasedRoute>} />
                <Route path="/branch/reports/students" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><StudentReport /></RoleBasedRoute>} />
                <Route path="/branch/reports/fees" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><FeeReport /></RoleBasedRoute>} />
                <Route path="/branch/reports/dues" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><DuesFeeReport /></RoleBasedRoute>} />
                <Route path="/branch/reports/balance-sheet" element={<RoleBasedRoute allowedRoles={['branch', 'admin', 'branch_admin']}><BalanceSheet /></RoleBasedRoute>} />
                <Route path="/branch/students/registration" element={<RoleBasedRoute allowedRoles={['branch', 'branch_admin', 'admin']}><StudentRegistration /></RoleBasedRoute>} />

                {/* ID Card Routes - Role-based */}
                <Route path="/admin/students/id-cards" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminIdCard /></RoleBasedRoute>} />
                <Route path="/branch/students/id-cards" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchIdCard /></RoleBasedRoute>} />

                {/* Admit Card Routes - Role-based */}
                <Route path="/admin/students/admit-cards" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminAdmitCard /></RoleBasedRoute>} />
                <Route path="/branch/students/admit-cards" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchAdmitCard /></RoleBasedRoute>} />

                {/* Course Management Routes - Role-based */}
                <Route path="/admin/courses/manage" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><CourseManagement /></RoleBasedRoute>} />
                <Route path="/branch/courses/courses" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchCourses /></RoleBasedRoute>} />

                {/* Subject Management Routes - Role-based */}
                <Route path="/admin/courses/subjects" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><SubjectManagement /></RoleBasedRoute>} />
                <Route path="/branch/courses/subjects" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchSubject /></RoleBasedRoute>} />

                {/* Program Management Routes - Role-based */}
                <Route path="/admin/courses/programs" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><ProgramManagement /></RoleBasedRoute>} />
                <Route path="/branch/courses/programs" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchProgram /></RoleBasedRoute>} />
                <Route path="/admin/courses/batches" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><BatchManagement /></RoleBasedRoute>} />
                <Route path="/branch/courses/batches" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchBatch /></RoleBasedRoute>} />

                {/* Certificate & Marksheet Management Routes - Role-based */}
                <Route path="/branch/admin-certificates-marksheets" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminCertificatesMarksheets /></RoleBasedRoute>} />
                <Route path="/branch/certificates-marksheets" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchCertificatesMarksheets /></RoleBasedRoute>} />

                {/* Online Exam Routes */}
                <Route path="/branch/exams/paper-sets" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin', 'branch_admin']}><BranchPaperSet /></RoleBasedRoute>} />
                <Route path="/branch/exams/admin-paper-sets" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminPaperSet /></RoleBasedRoute>} />
                <Route path="/branch/exams/questions" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchQuestion /></RoleBasedRoute>} />
                <Route path="/branch/exams/admin-questions" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin']}><AdminQuestion /></RoleBasedRoute>} />
                <Route path="/branch/exams/results" element={<RoleBasedRoute allowedRoles={['branch_admin']}><BranchResult /></RoleBasedRoute>} />
                <Route path="/branch/exams/admin-results" element={<RoleBasedRoute allowedRoles={['admin', 'franchise_admin', 'branch_admin']}><AdminResult /></RoleBasedRoute>} />














                {/* SuperAdmin Main Routes */}
                <Route path="/superadmin/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminDashboard /></RoleBasedRoute>} />

                {/* New SuperAdmin CRM Dashboard Routes */}
                {/* User Management Routes */}
                <Route path="/superadmin/users/all" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AllUsers /></RoleBasedRoute>} />
                <Route path="/superadmin/users/admin" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AdminUsers /></RoleBasedRoute>} />
                <Route path="/superadmin/users/instructor" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><InstructorsPage /></RoleBasedRoute>} />
                <Route path="/superadmin/users/student" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><StudentsPage /></RoleBasedRoute>} />
                <Route path="/superadmin/courses/all" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AllCourses /></RoleBasedRoute>} />

                {/* Learning & Assessment Routes */}
                <Route path="/superadmin/learning/assignments-submissions" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AssignmentsAndSubmissions /></RoleBasedRoute>} />


                {/* Payment Management Routes */}
                <Route path="/superadmin/payments/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><PaymentDashboard /></RoleBasedRoute>} />

                {/* Analytics Routes */}
                <Route path="/superadmin/analytics/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AdminDashboardAnalytics /></RoleBasedRoute>} />

                {/* System Administration Routes */}
                <Route path="/superadmin/system/all-enquiries" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AllEnquiries /></RoleBasedRoute>} />
                <Route path="/superadmin/system/franchise-enquiries" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><FranchiseEnquiries /></RoleBasedRoute>} />

                {/* Franchise Agreement Routes */}
                <Route path="/superadmin/franchise-agreements/generate" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><GenerateAgreement /></RoleBasedRoute>} />
                <Route path="/superadmin/franchise-agreements/upload-approve" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><UploadApprove /></RoleBasedRoute>} />

                {/* Ledger & Settlement Routes */}
                <Route path="/superadmin/ledger/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><LedgerDashboard /></RoleBasedRoute>} />
                <Route path="/superadmin/ledger/settlements" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><Settlements /></RoleBasedRoute>} />
                <Route path="/superadmin/ledger/transactions" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><Transactions /></RoleBasedRoute>} />

                {/* Ledger & Settlement Routes */}
                <Route path="/superadmin/ledger/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><LedgerDashboard /></RoleBasedRoute>} />
                <Route path="/superadmin/ledger/settlements" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><Settlements /></RoleBasedRoute>} />
                <Route path="/superadmin/ledger/transactions" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><Transactions /></RoleBasedRoute>} />

                {/* B2B Section Routes */}

                {/* Franchise Section Routes (only existing files) */}
                <Route path="/superadmin/franchise-admins/create" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><CreateFranchiseAdmin /></RoleBasedRoute>} />
                <Route path="/superadmin/franchise-admins/all" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AllFranchiseAdmins /></RoleBasedRoute>} />

                {/* Materials Route */}
                <Route path="/superadmin/materials/all" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminMaterials /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/programs" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminPrograms /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/courses" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminCourses /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/subjects" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminSubjects /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/batches" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminBatches /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/syllabus" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminSyllabus /></RoleBasedRoute>} />
                <Route path="/superadmin/materials/resources" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminStudyMaterials /></RoleBasedRoute>} />

                {/* Admin Management Routes (removed - files don't exist) */}

                {/* Users Management Routes (using existing files) */}
                <Route path="/superadmin/users/all" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AllUsers /></RoleBasedRoute>} />
                <Route path="/superladmin/users/admins" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AdminUsers /></RoleBasedRoute>} />
                <Route path="/superadmin/users/instructors" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><InstructorsPage /></RoleBasedRoute>} />
                <Route path="/superadmin/users/students" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><StudentsPage /></RoleBasedRoute>} />

                {/* Revenue Management Routes (only existing files) */}
                <Route path="/superadmin/revenue/transactions" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><TransactionHistory /></RoleBasedRoute>} />

                {/* Analytics & Reports Routes (only existing files) */}
                <Route path="/superadmin/analytics/dashboard" element={<RoleBasedRoute allowedRoles={['super_admin', 'superadmin']}><AdminDashboardAnalytics /></RoleBasedRoute>} />



                {/* Finance Routes (only existing files) */}
                <Route path="/superadmin/finance/transactions" element={<RoleBasedRoute allowedRoles={['super_admin', 'superladmin']}><TransactionHistory /></RoleBasedRoute>} />





                {/* Improved Dashboards */}
                {/* <Route path="/students-improved" element={<RoleBasedRoute allowedRoles={['student']}><ImprovedStudentDashboard/></RoleBasedRoute>} />
        <Route path="/instructor" element={<RoleBasedRoute allowedRoles={['instructor']}><ImprovedInstructorDashboard/></RoleBasedRoute>} />
        <Route path="/admin-improved" element={<RoleBasedRoute allowedRoles={['admin']}><ImprovedAdminDashboard/></RoleBasedRoute>} /> */}
                <Route path="/lesson/:id" element={<Lesson />} />
                <Route path="/add-instructor" element={<AddInstructor />} />

                <Route path="/Course" element={<Courses />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/collaboration" element={<Collaboration />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/courses-offer" element={<WeCourseOffer />} />
                <Route path="/browse-all-courses" element={<BrowseAllCourses />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/course-details/:id" element={<CourseDetailsPage />} />
                <Route path="/test-courses" element={<TestCoursesPage />} />
                <Route path="/ContactUs" element={<ContactUs />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/check" element={<Check />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/settings" element={<Settings />} />

                {/* Development/Testing Routes */}
                <Route path="/auth-debug" element={<AuthDebugPanel />} />
                <Route path="/partnerships" element={<Partnerships />} />

                {/* Catch-all route for unmatched paths - smart redirect based on route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <ConditionalFooter />
        </SessionManagerWrapper>
      </BrowserRouter>



    </>
  );
};

export default App;