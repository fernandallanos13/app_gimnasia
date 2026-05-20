import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import Jueces from './pages/Jueces'
import Resultados from './pages/Resultados'
import AdminInscriptas from './pages/AdminInscriptas'
import AdminPuntajes from './pages/AdminPuntajes'

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

        <Route path="/resultados" 
  element={<Resultados />}
/>
<Route path="/admin/inscriptas" element={<AdminInscriptas />} />
<Route path="/admin/puntajes" element={<AdminPuntajes />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App