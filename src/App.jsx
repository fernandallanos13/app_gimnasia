import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Jueces from './pages/Jueces'
import Resultados from './pages/Resultados'
import AdminInscriptas from './pages/AdminInscriptas'
import AdminPuntajes from './pages/AdminPuntajes'
import AdminPodios from './pages/AdminPodios'
import AdminJueces from './pages/AdminJueces'
import AdminTotales from './pages/AdminTotales'
import AdminCargasManuales from './pages/AdminCargasManuales'
import AdminTurnos from './pages/AdminTurnos'
import Inscripcion from './pages/Inscripcion'
import AdminInscripciones from './pages/AdminInscripciones'
import ResetPassword from './pages/ResetPassword'
import SuperAdmin from './pages/SuperAdmin'

import ProtectedRoute from './components/ProtectedRoute'
import SuperAdminRoute from './components/SuperAdminRoute'
import InstalarGymScore from './components/InstalarGymScore'

function App() {
  return (
    <BrowserRouter>
      <InstalarGymScore />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdmin />
            </SuperAdminRoute>
          }
        />

        <Route path="/jueces" element={<Jueces />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/inscripcion" element={<Inscripcion />} />

        <Route
          path="/admin/inscriptas"
          element={
            <ProtectedRoute>
              <AdminInscriptas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/puntajes"
          element={
            <ProtectedRoute>
              <AdminPuntajes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/podios"
          element={
            <ProtectedRoute>
              <AdminPodios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/jueces"
          element={
            <ProtectedRoute>
              <AdminJueces />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/totales"
          element={
            <ProtectedRoute>
              <AdminTotales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/cargas-manuales"
          element={
            <ProtectedRoute>
              <AdminCargasManuales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/turnos"
          element={
            <ProtectedRoute>
              <AdminTurnos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-inscripciones"
          element={
            <ProtectedRoute>
              <AdminInscripciones />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
