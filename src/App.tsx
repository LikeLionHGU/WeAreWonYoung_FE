import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ReportPage from './pages/ReportPage'
import CompletionPage from './pages/CompletionPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import EmptyReportPage from './pages/EmptyReportPage'

export default function App() { return <AppShell><Routes><Route path="/" element={<LandingPage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/report" element={<EmptyReportPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/videos/:videoId/analysis" element={<AnalysisPage />} /><Route path="/videos/:videoId/report" element={<ReportPage />} /><Route path="/videos/:videoId/completed" element={<CompletionPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell> }
