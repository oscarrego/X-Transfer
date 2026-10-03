import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Subscriptions from './pages/Subscriptions'
import Transfer from './pages/Transfer'
import Content from './pages/Content'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/content" element={<Content />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
