import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { useCustomer, useSession } from './lib/session'
import { AccountPage } from './pages/AccountPage'
import { AddDevicePage } from './pages/AddDevicePage'
import { AddTechnicianPage } from './pages/AddTechnicianPage'
import { CustomerLoginPage } from './pages/CustomerLoginPage'
import { DevicePage } from './pages/DevicePage'
import { FleetPage } from './pages/FleetPage'
import { LoginPage } from './pages/LoginPage'
import { MarketPage } from './pages/MarketPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { SignupPage } from './pages/SignupPage'
import { HardwarePage } from './pages/HardwarePage'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="hardware" element={<HardwarePage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="login" element={<LoginPage />} />
        {/* Customers (contract v2.4): public sign-up; buyers save devices and ask questions, never write passports. */}
        <Route path="signup" element={<SignupPage />} />
        <Route path="account/login" element={<CustomerLoginPage />} />
        <Route
          path="account"
          element={
            <RequireCustomer>
              <AccountPage />
            </RequireCustomer>
          }
        />
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
          path="devices/new"
          element={
            <RequireTechnician>
              <AddDevicePage />
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

/** The customer area: without a customer login, the customer login form shows in place (same rule as above). */
function RequireCustomer({ children }: { children: ReactNode }) {
  return useCustomer() ? children : <CustomerLoginPage />
}
