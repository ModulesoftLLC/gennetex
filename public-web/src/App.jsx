import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SiteLayout from './layouts/SiteLayout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ProjectsPage from './pages/ProjectsPage';
import ContactPage from './pages/ContactPage';
import CareersPage from './pages/CareersPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/careers" element={<CareersPage />} />
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
