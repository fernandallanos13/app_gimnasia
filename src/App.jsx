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

import ProtectedRoute from './components/ProtectedRoute'
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

        <Route path="/jueces" element={<Jueces />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/admin/inscriptas" element={<AdminInscriptas />} />
        <Route path="/admin/puntajes" element={<AdminPuntajes />} />
        <Route path="/admin/podios" element={<AdminPodios />} />
        <Route path="/admin/jueces" element={<AdminJueces />} />
        <Route path="/admin/totales" element={<AdminTotales />} />
        <Route path="/admin/cargas-manuales" element={<AdminCargasManuales />} />
        <Route path="/admin/turnos" element={<AdminTurnos />} />
        <Route path="/inscripcion" element={<Inscripcion />} />
        <Route path="/admin-inscripciones" element={<AdminInscripciones />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App