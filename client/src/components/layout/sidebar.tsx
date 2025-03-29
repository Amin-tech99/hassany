import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  Home, 
  FileText, 
  Mic, 
  Users, 
  Download, 
  LogOut, 
  X,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    color: "text-blue-400"
  },
  {
    href: "/transcriptions",
    label: "Transcriptions",
    icon: <FileText className="mr-3 h-5 w-5" />,
    color: "text-green-400"
  },
  {
    href: "/audio-processing",
    label: "Audio Processing",
    icon: <Mic className="mr-3 h-5 w-5" />,
    color: "text-yellow-400",
    adminOnly: true
  },
  {
    href: "/team",
    label: "Team Management",
    icon: <Users className="mr-3 h-5 w-5" />,
    adminOnly: true,
    color: "text-purple-400"
  },
  {
    href: "/export",
    label: "Export Data",
    icon: <Download className="mr-3 h-5 w-5" />,
    adminOnly: true,
    color: "text-pink-400"
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          "fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-20 shadow-xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
          <h1 className="text-xl font-bold truncate text-white">
            <span className="text-primary-500">Hassaniya</span> Transcription
          </h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden rounded-full p-1 hover:bg-slate-700 text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-4">
          <div className="space-y-2">
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
                      "flex items-center px-5 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-slate-700 text-white font-bold shadow-md" 
                        : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                    )}
                  >
                    <span className={item.color || "text-white"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t border-slate-700 bg-slate-800/80 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-medium text-base shadow-md">
                  {userInitials}
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-semibold text-white">{user.fullName}</div>
                <div className="text-xs text-slate-300">{getRoleDisplay(user.role)}</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto rounded-lg hover:bg-slate-700/80 p-2" 
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
