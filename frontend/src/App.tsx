import { Link, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Onboarding } from './pages/Onboarding'
import { SessionPage } from './pages/Session'
import { Insights } from './pages/Insights'
import { Dev } from './pages/Dev'
import { Progress } from './pages/Progress'
import { Questions } from './pages/Questions'
import { Dashboard } from './pages/Dashboard'
import { PageShell } from './components/PageShell'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/study" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/session/:id" element={<SessionPage />} />
      <Route path="/insights/:subjectId" element={<Insights />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/questions" element={<Questions />} />
      <Route path="/dev" element={<Dev />} />
      <Route
        path="*"
        element={
          <PageShell where="Page not found">
            <h1 className="text-3xl font-extrabold">That page doesn't exist.</h1>
            <Link to="/" className="mt-4 inline-block font-semibold underline">Go to dashboard</Link>
          </PageShell>
        }
      />
    </Routes>
  )
}
