import { Routes, Route, Navigate } from 'react-router-dom';
import { EntryPage } from './components/EntryPage';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal } from './components/StudentPortal';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/student/:studentId" element={<StudentPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;