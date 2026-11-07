import { Link, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Onboarding } from './pages/Onboarding'
import { SessionPage } from './pages/Session'
import { InsightsShell } from './pages/InsightsShell'
import { PageShell } from './components/PageShell'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/session/:id" element={<SessionPage />} />
      <Route path="/insights/:subjectId" element={<InsightsShell />} />
      <Route
        path="*"
        element={
          <PageShell where="Page not found">
            <h1 className="text-3xl font-extrabold">That page doesn't exist.</h1>
            <Link to="/" className="mt-4 inline-block font-semibold underline">Go to Home</Link>
          </PageShell>
        }
      />
    </Routes>
  )
}
