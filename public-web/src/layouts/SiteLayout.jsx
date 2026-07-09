import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function SiteLayout({ showFooter = true }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className={isHome ? 'bg-black text-white' : 'min-h-screen bg-black text-white'}>
      <Navbar />
      <Outlet />
      {showFooter ? <Footer /> : null}
    </div>
  );
}
