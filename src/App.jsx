import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminLayout from './layouts/AdminLayout';
import UserManagement from "./components/admin/UserManagement.jsx";
import HrTaskHub from "./pages/HrTaskHub.jsx";
import NewEmployeeSheet from "./components/admin/NewEmployeeSheet.jsx";
import InsuranceSheet from "./components/admin/InsuranceSheet.jsx";
import ResignedEmployeeSheet from "./components/admin/ResignedEmployeeSheet.jsx";
import { isAdmin, canViewAdminArea } from './utils/roles';

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Page not found</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">No route matches this URL.</p>
            </div>
        </div>
    );
};

const AppLoading = () => (
    <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300">Loading...</div>
);

const HomeRoute = () => {
    return <Navigate to="/login" replace />;
};

/** Example protected nested route — refresh here must serve index.html (see render.yaml SPA rewrite). */
const AppointmentExamplePage = () => {
    const { id } = useParams();
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <p className="text-lg font-bold">Appointment</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">ID: {id}</p>
        </div>
    );
};

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AppLoading />;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

// eslint-disable-next-line react/prop-types
const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AppLoading />;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!canViewAdminArea(user)) return <Navigate to="/dashboard" replace />;
    return children;
};

// eslint-disable-next-line react/prop-types
const SuperAdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AppLoading />;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAdmin(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/" element={<HomeRoute />} />
                        <Route path="/index.html" element={<HomeRoute />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <PrivateRoute>
                                    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                                        <p className="text-lg font-bold">Profile</p>
                                    </div>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/appointments/:id"
                            element={
                                <PrivateRoute>
                                    <AppointmentExamplePage />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <AdminRoute>
                                    <AdminLayout />
                                </AdminRoute>
                            }
                        >
                            <Route index element={
                                <SuperAdminRoute>
                                    <UserManagement />
                                </SuperAdminRoute>
                            } />
                            <Route path="hr" element={<HrTaskHub />} />
                            <Route path="hr/new-employees" element={<NewEmployeeSheet />} />
                            <Route path="hr/insurance" element={<InsuranceSheet />} />
                            <Route path="hr/resigned-employees" element={<ResignedEmployeeSheet />} />
                        </Route>
                        <Route
                            path="/hr"
                            element={
                                <AdminRoute>
                                    <AdminLayout />
                                </AdminRoute>
                            }
                        >
                            <Route index element={<HrTaskHub />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
