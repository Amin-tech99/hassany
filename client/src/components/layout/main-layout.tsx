import { Sidebar } from "./sidebar";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeftToLine, ArrowRightToLine, Menu, X, PanelLeftClose, PanelLeftOpen, Maximize2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

// DNA Background Animation Component
const DnaBackground = () => {
  // Generate DNA strands
  const generateStrands = () => {
    const strands = [];
    for (let i = 0; i < 5; i++) {
      strands.push(
        <motion.div
          key={`strand-${i}`}
          className="absolute h-full"
          style={{
            left: `${15 + i * 20}%`,
            width: '1px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.2), rgba(255,255,255,0.05))'
          }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: '100%', 
            opacity: 1,
            filter: 'blur(0.5px)'
          }}
          transition={{ 
            duration: 2,
            delay: i * 0.2,
            ease: "easeOut"
          }}
        />
      );
    }
    return strands;
  };

  // Generate particles
  const generateParticles = () => {
    const particles = [];
    // Reduced count for better performance on mobile
    const count = window.innerWidth < 768 ? 15 : 30; 
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 3 + 1; // Smaller particles
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = Math.random() * 10 + 10;
      
      particles.push(
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full bg-white/10"
          style={{
            width: size,
            height: size,
            left: `${posX}%`,
            top: `${posY}%`,
            zIndex: 0
          }}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0], // Less opacity for subtlety
            x: [0, Math.random() * 30 - 15], // Less movement
            y: [0, Math.random() * 30 - 15]
          }}
          transition={{ 
            duration, 
            delay,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      );
    }
    
    return particles;
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
      {generateStrands()}
      {generateParticles()}
    </div>
  );
};

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  
  // Check window size for mobile view and set sidebar collapsed accordingly
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        // Only update from localStorage if not mobile
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState !== null) {
          setSidebarCollapsed(savedState === 'true');
        }
        
        // Check if sidebar was hidden
        const hiddenState = localStorage.getItem('sidebar-hidden');
        if (hiddenState !== null) {
          setSidebarHidden(hiddenState === 'true');
        }
      }
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Save preference when changed
  const handleCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    if (!isMobile) {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    }
  };
  
  // Toggle sidebar visibility for full-screen mode
  const toggleSidebarVisibility = () => {
    const newHiddenState = !sidebarHidden;
    setSidebarHidden(newHiddenState);
    localStorage.setItem('sidebar-hidden', String(newHiddenState));
    
    // Close mobile sidebar if open
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
    
    // Hide the banner after toggling
    setShowBanner(false);
  };
  
  // Toggle sidebar open/closed on mobile
  const toggleMobileSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
      {/* DNA Background Animation with reduced opacity for better readability */}
      <DnaBackground />
      
      {/* Very visible, impossible-to-miss banner for toggling fullscreen */}
      {showBanner && (
        <div className="fixed top-0 left-0 w-full bg-primary z-50 py-2 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <span className="font-bold text-white">Want to see more content?</span>
            <span className="ml-2 text-white text-sm hidden sm:inline">Toggle fullscreen mode to hide the sidebar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebarVisibility}
              className="bg-white text-primary font-bold px-4 py-2 rounded-md hover:bg-white/90 flex items-center gap-2"
            >
              <Maximize2 size={18} />
              <span>{sidebarHidden ? "Show Sidebar" : "Fullscreen Mode"}</span>
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-white hover:text-white/80"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      
      {/* Main fullscreen toggle button - SUPER VISIBLE */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleSidebarVisibility}
          className="bg-primary shadow-lg hover:bg-primary-600 text-white rounded-full p-4 h-16 w-16 flex items-center justify-center animate-pulse hover:animate-none"
          aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
          title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarHidden ? (
            <PanelLeftOpen size={28} />
          ) : (
            <Maximize2 size={28} />
          )}
        </button>
      </div>
      
      {/* Combined sidebar toggle button for both mobile and desktop */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        {/* Mobile menu button */}
        {isMobile && (
          <button 
            onClick={toggleMobileSidebar}
            className="bg-primary/80 hover:bg-primary text-white rounded-lg p-2 shadow-lg border border-primary-600 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        )}
        
        {/* Top-left fullscreen toggle button */}
        <button
          onClick={toggleSidebarVisibility}
          className={cn(
            "bg-primary/80 hover:bg-primary text-white rounded-lg p-2 shadow-lg border border-primary-600 flex items-center justify-center transition-all duration-300",
            isMobile ? (sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100") : "opacity-100"
          )}
          aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
          title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarHidden ? (
            <PanelLeftOpen size={24} />
          ) : (
            <PanelLeftClose size={24} />
          )}
          {!isMobile && (
            <span className="ml-2 font-medium hidden sm:inline-block">
              {sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
            </span>
          )}
        </button>
      </div>
      
      {/* Sidebar */}
      <div className={cn(
        "transition-transform duration-300 ease-in-out",
        isMobile ? "fixed inset-y-0 left-0 z-40 transform" : "",
        isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0",
        sidebarHidden && !isMobile ? "-translate-x-full" : ""
      )}>
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={handleCollapseChange} />
      </div>
      
      {/* Mobile overlay when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 relative z-10",
        "pt-16", // Basic padding for all views
        showBanner && "pt-28", // Extra padding when banner is visible
        isMobile ? "pl-0" : (
          sidebarHidden ? "pl-0" : (sidebarCollapsed ? "md:pl-20" : "md:pl-72")
        )
      )}>
        {/* Main Content */}
        <main className="py-4 px-3 sm:py-6 sm:px-4">
          <div className="backdrop-blur-sm bg-black/10 rounded-xl border border-white/5 shadow-xl p-3 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
