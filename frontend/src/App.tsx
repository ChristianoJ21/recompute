import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { useSession } from './lib/session'
import { AddTechnicianPage } from './pages/AddTechnicianPage'
import { DevicePage } from './pages/DevicePage'
import { FleetPage } from './pages/FleetPage'
import { LoginPage } from './pages/LoginPage'
import { MarketPage } from './pages/MarketPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { ShowcasePage } from './pages/ShowcasePage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShowcasePage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="login" element={<LoginPage />} />
        {/* Public: everyone picks the appearance; technicians also get profile and password. */}
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="fleet"
          element={
            <RequireTechnician>
              <FleetPage />
            </RequireTechnician>
          }
        />
        <Route
          path="technicians/new"
          element={
            <RequireTechnician>
              <AddTechnicianPage />
            </RequireTechnician>
          }
        />
        {/* Public on purpose: a buyer must be able to read the passport (PRD 15.1). */}
        <Route path="device/:id" element={<DevicePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

/**
 * The technician area: without a login, the login form shows in place, and the page appears once logged in.
 * (No redirect: a redirect would race the navigation that follows a logout.)
 */
function RequireTechnician({ children }: { children: ReactNode }) {
  return useSession() ? children : <LoginPage />
}
