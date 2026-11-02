import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './hooks/useAuth'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ReportPage from './pages/ReportPage'
import CompletionPage from './pages/CompletionPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import ReportRedirectPage from './pages/ReportRedirectPage'

export default function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/report" element={<ReportRedirectPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/videos/:videoId/analysis" element={<AnalysisPage />} />
            <Route path="/videos/:videoId/report" element={<ReportPage />} />
            <Route path="/videos/:videoId/completed" element={<CompletionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  )
}
