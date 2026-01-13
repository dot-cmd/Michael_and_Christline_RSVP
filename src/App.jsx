import { Routes, Route } from 'react-router-dom'
import Guest from './pages/Guest'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
