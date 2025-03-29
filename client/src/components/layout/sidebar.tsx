import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  Home, 
  FileText, 
  Mic, 
  Users, 
  Download, 
  LogOut, 
  X,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  color?: string;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <Home className="mr-3 h-5 w-5" />,
    color: "text-primary-500"
  },
  {
    href: "/transcriptions",
    label: "Transcriptions",
    icon: <FileText className="mr-3 h-5 w-5" />,
    color: "text-primary-500"
  },
  {
    href: "/audio-processing",
    label: "Audio Processing",
    icon: <Mic className="mr-3 h-5 w-5" />,
    color: "text-primary-500",
    adminOnly: true
  },
  {
    href: "/team",
    label: "Team Management",
    icon: <Users className="mr-3 h-5 w-5" />,
    adminOnly: true,
    color: "text-primary-500"
  },
  {
    href: "/export",
    label: "Export Data",
    icon: <Download className="mr-3 h-5 w-5" />,
    adminOnly: true,
    color: "text-primary-500"
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar collapsed state from localStorage on initial render
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsedState) {
      setIsCollapsed(JSON.parse(savedCollapsedState));
    }
  }, []);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
    // Dispatch custom event for MainLayout to detect
    window.dispatchEvent(new Event('sidebar-toggled'));
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const userInitials = getInitials(user.fullName);

  // Get user role display text
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin": return "Team Leader";
      case "transcriber": return "Transcriber";
      case "reviewer": return "Reviewer";
      case "collector": return "Audio Collector";
      default: return role;
    }
  };

  const sidebarWidth = isCollapsed ? "w-20" : "w-72";

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center h-16 px-4 shadow-sm">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-2 focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-gray-900 dark:text-gray-100 font-semibold text-lg ml-3">
          <span className="text-primary-600 dark:text-primary-500">Hassaniya</span> Transcription
        </h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Sidebar Container - Modified to be collapsible */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 transition-all duration-300 z-20 shadow-md flex flex-col",
          sidebarWidth,
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0" // Only hide on mobile
        )}
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {!isCollapsed && (
            <h1 className="text-xl font-bold truncate">
              <span className="text-primary-600 dark:text-primary-500">Hassaniya</span>
            </h1>
          )}
          <div className="flex items-center space-x-1 ml-auto">
            <ThemeToggle />
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <nav className="mt-6 px-4 flex-grow">
          <div className="space-y-1">
            {navItems.map((item) => {
              // Skip admin-only items for non-admins
              if (item.adminOnly && !isAdmin) return null;
              
              const isActive = location === item.href;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <a
                    className={cn(
                      "flex items-center py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                      isCollapsed ? "justify-center px-2" : "px-4",
                      isActive 
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <span className={isActive ? "text-primary-600 dark:text-primary-400" : "text-primary-500 dark:text-primary-400"}>
                      {item.icon}
                    </span>
                    {!isCollapsed && item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className={cn("py-4", isCollapsed ? "px-2" : "px-6")}>
            <div className="flex items-center">
              {!isCollapsed && (
                <>
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium text-base shadow-sm">
                      {userInitials}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplay(user.role)}</div>
                  </div>
                </>
              )}
              {isCollapsed && (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium text-base shadow-sm mx-auto">
                  {userInitials}
                </div>
              )}
              {!isCollapsed && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 p-2" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <span className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400">⟳</span>
                  ) : (
                    <LogOut className="h-5 w-5 text-red-500 dark:text-red-400" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button - Positioned at the edge of the sidebar */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-30 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-1.5 shadow-md transition-all duration-300",
          isCollapsed
            ? "left-[76px]" // When collapsed, position at the edge of collapsed sidebar
            : "left-[278px]" // When expanded, position at the edge of expanded sidebar
        )}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </>
  );
}
