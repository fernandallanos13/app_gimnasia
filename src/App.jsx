import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Jueces from './pages/Jueces'
import Resultados from './pages/Resultados'

import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/admin-login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route path="/jueces" element={<Jueces />} />

        <Route
  path="/resultados/:torneoId"
  element={<Resultados />}
/>

      </Routes>
    </BrowserRouter>
  )
}

export default App