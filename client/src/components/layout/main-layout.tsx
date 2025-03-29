import { Sidebar } from "./sidebar";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Check localStorage to determine if sidebar is collapsed
  useEffect(() => {
    const checkSidebarState = () => {
      const savedState = localStorage.getItem('sidebar-collapsed');
      setIsSidebarCollapsed(savedState ? JSON.parse(savedState) : false);
    };
    
    // Check initially
    checkSidebarState();
    
    // Set up event listener for storage changes
    window.addEventListener('storage', checkSidebarState);
    
    // Custom event listener for sidebar toggle
    const handleStorageChange = () => {
      checkSidebarState();
    };
    
    window.addEventListener('sidebar-toggled', handleStorageChange);
    
    // Check every 500ms as a fallback
    const interval = setInterval(checkSidebarState, 500);
    
    return () => {
      window.removeEventListener('storage', checkSidebarState);
      window.removeEventListener('sidebar-toggled', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      
      {/* Main Content Area - Adjust padding based on sidebar state */}
      <div 
        className={cn(
          "transition-all duration-300 pt-16 md:pt-0",
          isSidebarCollapsed ? "md:pl-20" : "md:pl-72"
        )}
      >
        {/* Main Content */}
        <main className="py-6 px-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
