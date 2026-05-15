import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Admin from './pages/Admin'
import Jueces from './pages/Jueces'
import Resultados from './pages/Resultados'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/jueces" element={<Jueces />} />
        <Route path="/resultados" element={<Resultados />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App