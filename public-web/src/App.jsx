import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import ServicesSection from './components/ServicesSection';
import ProjectsSection from './components/ProjectsSection';
import CareersSection from './components/CareersSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import { VIDEO_URL } from './lib/supabase';

export default function App() {
  return (
    <div className="bg-black text-white">
      {/* Cinematic full-viewport hero */}
      <header className="relative min-h-screen overflow-hidden">
        <video
          className="fixed inset-0 z-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
        <div
          className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-xl bottom-blur-mask"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <HeroSection />
        </div>
      </header>

      <main>
        <AboutSection />
        <ServicesSection />
        <ProjectsSection />
        <CareersSection />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
