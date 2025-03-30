import { Link, useLocation } from "react-router-dom";
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
  ChevronRight,
  LayoutGrid,
  Headphones,
  FileDown,
  Settings,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  color?: string;
  active: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutGrid className="h-5 w-5" />,
    active: false,
    color: "text-blue-400"
  },
  {
    href: "/transcriptions",
    label: "Transcriptions",
    icon: <FileText className="h-5 w-5" />,
    active: false,
    color: "text-green-400"
  },
  {
    href: "/audio-processing",
    label: "Audio Processing",
    icon: <Headphones className="h-5 w-5" />,
    active: false,
    color: "text-yellow-400",
    adminOnly: true
  },
  {
    href: "/team",
    label: "Team Management",
    icon: <Users className="h-5 w-5" />,
    active: false,
    adminOnly: true,
    color: "text-purple-400"
  },
  {
    href: "/export",
    label: "Export Data",
    icon: <FileDown className="h-5 w-5" />,
    active: false,
    adminOnly: true,
    color: "text-pink-400"
  },
  {
    href: "/cleanup",
    label: "Cleanup Storage",
    icon: <Trash2 className="h-5 w-5" />,
    active: false,
    adminOnly: true,
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Close mobile menu on location change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  
  const handleLogout = () => {
    logoutMutation.mutate();
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

  // Toggle collapse button - desktop only
  const ToggleButton = () => (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="absolute -right-4 top-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-700 shadow-lg hover:bg-gray-100 focus:outline-none transition-all duration-300 hover:scale-110 border border-gray-200"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronRight size={18} className="text-black" /> : <ChevronLeft size={18} className="text-black" />}
    </button>
  );

  // Helper to check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 md:hidden bg-gradient-to-r from-slate-900 to-slate-800 flex items-center h-16 px-4 shadow-md">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-white hover:bg-slate-700 rounded p-1 focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-white font-bold text-lg ml-4">Hassaniya Transcription</h1>
      </div>

      {/* Sidebar Container */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-20 shadow-xl",
          collapsed ? "w-20" : "w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <ToggleButton />
        
        <div className={cn(
          "flex items-center justify-between h-20 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800",
          collapsed ? "px-2" : "px-6"
        )}>
          {!collapsed && (
            <h1 className="text-xl font-bold truncate text-white">
              <span className="text-primary-500">Hassaniya</span> Transcription
            </h1>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <span className="text-2xl font-bold text-primary-500">H</span>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden rounded-full p-1 hover:bg-slate-700 text-white"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <nav className={cn("mt-6", collapsed ? "px-2" : "px-4")}>
          <div className="space-y-2">
            {navItems.map((item) => {
              // Skip admin-only items for non-admins
              if (item.adminOnly && !isAdmin) return null;
              
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    collapsed ? "justify-center px-2" : "px-5",
                    active 
                      ? "bg-primary-600/30 text-white font-bold shadow-md border-l-4 border-primary-500" 
                      : "text-slate-300 hover:bg-slate-700/60 hover:text-white hover:border-l-4 hover:border-primary-500/50"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn(
                    item.color || "text-white",
                    "transition-transform duration-200",
                    active && "scale-110"
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <div className={cn("py-5", collapsed ? "px-2" : "px-6")}>
            <div className={cn("flex items-center", collapsed && "flex-col")}>
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium text-base shadow-md">
                  {userInitials}
                </div>
              </div>
              {!collapsed && (
                <div className="ml-4">
                  <div className="text-sm font-semibold text-white">{user.fullName}</div>
                  <div className="text-xs text-slate-300">{getRoleDisplay(user.role)}</div>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-lg hover:bg-red-500/20 p-2", collapsed ? "mt-2" : "ml-auto")} 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <span className="h-5 w-5 animate-spin text-white">⟳</span>
                ) : (
                  <LogOut className="h-5 w-5 text-red-400" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
