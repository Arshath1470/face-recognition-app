import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import AuthPage from './pages/AuthPage.jsx';
import History from './pages/History.jsx';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Scan from './pages/Scan.jsx';

const protect = (element) => <RequireAuth>{element}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="signin" element={<AuthPage mode="signin" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="scan" element={protect(<Scan />)} />
        <Route path="history" element={protect(<History />)} />
        <Route path="profile" element={protect(<Profile />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
