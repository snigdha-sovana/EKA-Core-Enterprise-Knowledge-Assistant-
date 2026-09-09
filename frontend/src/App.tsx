import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import Login from './Login';
import { RoutePlaceholder } from './components/common/RoutePlaceholder';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EkaChatPage from './pages/employee/EkaChatPage';
import EmployeeRequests from './pages/employee/EmployeeRequests';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinanceRequests from './pages/finance/FinanceRequests';
import FinanceDocuments from './pages/finance/FinanceDocuments';
import HrDashboard from './pages/hr/HrDashboard';
import HrRequests from './pages/hr/HrRequests';
import HrDocuments from './pages/hr/HrDocuments';
import OrionDashboard from './pages/projects/OrionDashboard';
import OrionRequests from './pages/projects/OrionRequests';
import OrionDocuments from './pages/projects/OrionDocuments';
import EmployeeDocuments from './pages/employee/EmployeeDocuments';
import ProfilePage from './pages/employee/ProfilePage';
import AttendancePage from './pages/employee/AttendancePage';
import LeaveManagementPage from './pages/employee/LeaveManagementPage';
import ExpenseClaimsPage from './pages/employee/ExpenseClaimsPage';
import EmployeeProjectsPage from './pages/employee/EmployeeProjectsPage';
import ExpenseAuditPage from './pages/finance/ExpenseAuditPage';
import OrionTeamPage from './pages/projects/OrionTeamPage';
import UserManagementPage from './pages/superadmin/UserManagementPage';
import DepartmentManagementPage from './pages/superadmin/DepartmentManagementPage';
import EkaAnalyticsPage from './pages/superadmin/EkaAnalyticsPage';
import SecurityAuditLogsPage from './pages/superadmin/SecurityAuditLogsPage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import KnowledgeHub from './pages/superadmin/KnowledgeHub';
import AccessControlMatrix from './pages/superadmin/AccessControlMatrix';
import KnowledgeGaps from './pages/superadmin/KnowledgeGaps';
import SyncMonitor from './pages/superadmin/SyncMonitor';


function RootRedirect() {
  const { currentUser } = useApp();
  if (currentUser.role === 'employee') return <Navigate to="/app/dashboard" replace />;
  if (currentUser.role === 'finance_admin') return <Navigate to="/admin/finance/dashboard" replace />;
  if (currentUser.role === 'hr_admin') return <Navigate to="/admin/hr/dashboard" replace />;
  if (currentUser.role === 'orion_admin') return <Navigate to="/admin/projects/orion/dashboard" replace />;
  if (currentUser.role === 'super_admin') return <Navigate to="/super-admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Root Redirect based on persona */}
      <Route path="/" element={<RootRedirect />} />

      {/* Employee ERP Experience */}
      <Route
        path="/app/dashboard"
        element={
          <AppLayout>
            <EmployeeDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/app/profile"
        element={
          <AppLayout>
            <ProfilePage />
          </AppLayout>
        }
      />
      <Route
        path="/app/attendance"
        element={
          <AppLayout>
            <AttendancePage />
          </AppLayout>
        }
      />
      <Route
        path="/app/leave"
        element={
          <AppLayout>
            <LeaveManagementPage />
          </AppLayout>
        }
      />
      <Route
        path="/app/expenses"
        element={
          <AppLayout>
            <ExpenseClaimsPage />
          </AppLayout>
        }
      />
      <Route
        path="/app/projects"
        element={
          <AppLayout>
            <EmployeeProjectsPage />
          </AppLayout>
        }
      />

      <Route
        path="/app/documents"
        element={
          <AppLayout>
            <EmployeeDocuments />
          </AppLayout>
        }
      />
      <Route
        path="/app/eka/chat"
        element={
          <AppLayout>
            <EkaChatPage />
          </AppLayout>
        }
      />
      <Route
        path="/app/eka/requests"
        element={
          <AppLayout>
            <EmployeeRequests />
          </AppLayout>
        }
      />

      {/* Finance Admin Experience */}
      <Route
        path="/admin/finance/dashboard"
        element={
          <AppLayout>
            <FinanceDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/admin/finance/requests"
        element={
          <AppLayout>
            <FinanceRequests />
          </AppLayout>
        }
      />
      <Route
        path="/admin/finance/expenses"
        element={
          <AppLayout>
            <ExpenseAuditPage />
          </AppLayout>
        }
      />

      <Route
        path="/admin/finance/documents"
        element={
          <AppLayout>
            <FinanceDocuments />
          </AppLayout>
        }
      />
      <Route
        path="/admin/finance/knowledge"
        element={
          <AppLayout>
            <FinanceDocuments />
          </AppLayout>
        }
      />

      {/* HR Admin Experience */}
      <Route
        path="/admin/hr/dashboard"
        element={
          <AppLayout>
            <HrDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/admin/hr/requests"
        element={
          <AppLayout>
            <HrRequests />
          </AppLayout>
        }
      />
      <Route
        path="/admin/hr/documents"
        element={
          <AppLayout>
            <HrDocuments />
          </AppLayout>
        }
      />
      <Route
        path="/admin/hr/policies"
        element={
          <AppLayout>
            <HrDocuments />
          </AppLayout>
        }
      />
      <Route
        path="/admin/hr/knowledge"
        element={
          <AppLayout>
            <HrDocuments />
          </AppLayout>
        }
      />

      {/* Project Orion Admin Experience */}
      <Route
        path="/admin/projects/orion/dashboard"
        element={
          <AppLayout>
            <OrionDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/admin/projects/orion/requests"
        element={
          <AppLayout>
            <OrionRequests />
          </AppLayout>
        }
      />
      <Route
        path="/admin/projects/orion/documents"
        element={
          <AppLayout>
            <OrionDocuments />
          </AppLayout>
        }
      />
      <Route
        path="/admin/projects/orion/team"
        element={
          <AppLayout>
            <OrionTeamPage />
          </AppLayout>
        }
      />
      <Route
        path="/admin/projects/orion/knowledge"
        element={
          <AppLayout>
            <OrionDocuments />
          </AppLayout>
        }
      />

      {/* Super Admin Experience */}
      <Route
        path="/super-admin/dashboard"
        element={
          <AppLayout>
            <SuperAdminDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/users"
        element={
          <AppLayout>
            <UserManagementPage />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/departments"
        element={
          <AppLayout>
            <DepartmentManagementPage />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/knowledge"
        element={
          <AppLayout>
            <KnowledgeHub />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/access-control"
        element={
          <AppLayout>
            <AccessControlMatrix />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/eka-analytics"
        element={
          <AppLayout>
            <EkaAnalyticsPage />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/knowledge-gaps"
        element={
          <AppLayout>
            <KnowledgeGaps />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/sync-monitor"
        element={
          <AppLayout>
            <SyncMonitor />
          </AppLayout>
        }
      />
      <Route
        path="/super-admin/audit-logs"
        element={
          <AppLayout>
            <SecurityAuditLogsPage />
          </AppLayout>
        }
      />


      {/* Catch-all */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}
