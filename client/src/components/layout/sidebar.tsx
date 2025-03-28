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
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <Home className="mr-3 h-5 w-5" />,
  },
  {
    href: "/transcriptions",
    label: "Transcriptions",
    icon: <FileText className="mr-3 h-5 w-5" />,
  },
  {
    href: "/audio-processing",
    label: "Audio Processing",
    icon: <Mic className="mr-3 h-5 w-5" />,
  },
  {
    href: "/team",
    label: "Team Management",
    icon: <Users className="mr-3 h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/export",
    label: "Export Data",
    icon: <Download className="mr-3 h-5 w-5" />,
    adminOnly: true,
  },
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
      <div className="sticky top-0 z-10 md:hidden bg-primary-600 flex items-center h-16 px-4">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-white focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-white font-bold text-lg ml-4">Hassaniya Transcription</h1>
      </div>

      {/* Sidebar Container */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-primary-900 text-white transition-all duration-300 z-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-primary-700">
          <h1 className="text-xl font-bold truncate">Hassaniya Transcription</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden rounded-full p-1 hover:bg-primary-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-4 px-2">
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
                      "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                      isActive 
                        ? "bg-primary-700 text-white" 
                        : "text-primary-100 hover:bg-primary-700 hover:text-white"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t border-primary-700">
          <div className="px-4 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                  {userInitials}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-white">{user.fullName}</div>
                <div className="text-xs text-primary-200">{getRoleDisplay(user.role)}</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto rounded hover:bg-primary-800 p-1" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <span className="h-5 w-5 animate-spin">⟳</span>
                ) : (
                  <LogOut className="h-5 w-5 text-primary-200" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
