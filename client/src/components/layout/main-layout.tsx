import { Sidebar } from "./sidebar";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check for user preference in localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);
  
  // Save preference when changed
  const handleCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={handleCollapseChange} />
      
      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "md:pl-20" : "md:pl-72"
      )}>
        {/* Main Content */}
        <main className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
