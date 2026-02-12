import React, { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  NavLink,
} from "react-router-dom";
import { syncOfflineUploads } from "./lib/offlineQueue";
import Header from "./components/Header";
import ToastContainer from "./components/ui/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";
import { useToastStore } from "./store/useToastStore";
import {
  Compass,
  PlusCircle,
  Map as MapIcon,
  Info,
  Trophy,
} from "lucide-react";

// Pages (lazy would be nice but keeping simple for now)
import ExplorePage from "./pages/ExplorePage";
import AboutPage from "./pages/AboutPage";
import NotFoundPage from "./pages/NotFoundPage";
import LetteringDetailPage from "./pages/LetteringDetailPage";
import ContributionPanel from "./components/ContributionPanel";
import MapSection from "./components/MapSection";
import AdminPanel from "./components/AdminPanel";
import ContributorProfile from "./components/ContributorProfile";
import CommunityPage from "./components/CommunityPage";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App: React.FC = () => {
  const { addToast } = useToastStore();

  // Sync offline uploads when connectivity returns
  useEffect(() => {
    const handleOnline = async () => {
      const synced = await syncOfflineUploads();
      if (synced > 0) {
        addToast(
          `${synced} offline upload${synced > 1 ? "s" : ""} synced`,
          "success",
        );
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [addToast]);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture">
      <div className="grain-overlay"></div>
      <Header />
      <ToastContainer />
      <ScrollToTop />

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-16 relative">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route
              path="/contribute"
              element={
                <ContributionPanel
                  onCancel={() => window.history.back()}
                  onSubmit={() => {
                    window.location.href = "/";
                  }}
                />
              }
            />
            <Route path="/map" element={<MapSection />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route
              path="/admin"
              element={<AdminPanel onClose={() => window.history.back()} />}
            />
            <Route
              path="/contributor/:tag"
              element={<ContributorProfileWrapper />}
            />
            <Route path="/lettering/:id" element={<LetteringDetailPage />} />
            {/* Backward compat: ?admin redirects */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <BottomNav />
    </div>
  );
};

// Wrapper to adapt ContributorProfile to router
function ContributorProfileWrapper() {
  return <ContributorProfile onBack={() => window.history.back()} />;
}

function BottomNav() {
  const navItems = [
    { to: "/", icon: Compass, label: "Explore", end: true },
    { to: "/contribute", icon: PlusCircle, label: "Contribute" },
    { to: "/map", icon: MapIcon, label: "Map" },
    { to: "/community", icon: Trophy, label: "Community" },
    { to: "/about", icon: Info, label: "Info" },
  ];

  return (
    <nav className="sticky bottom-10 self-center w-[92%] md:w-[65%] bg-white border-4 border-black p-6 flex justify-between items-center z-50 brutalist-shadow-lg mx-auto mb-10 transition-all hover:scale-[1.01]">
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${
              isActive ? "text-[#cc543a]" : "text-slate-400"
            }`
          }
        >
          <Icon size={28} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default App;
