import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { FleetPage } from './pages/FleetPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<FleetPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
