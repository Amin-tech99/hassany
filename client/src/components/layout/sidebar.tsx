import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  FileText, 
  Users, 
  LogOut,
  FileDown,
  ListMusic,
  AlertCircle,
  FolderArchive,
  BookText,
  Database,
  PanelLeftClose,
  Maximize
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  isAction?: boolean;
  disabled?: boolean;
}

function NavItem({
  to,
  icon,
  label,
  isActive,
  onClick,
  isAction,
  disabled
}: NavItemProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Don't use tooltips on mobile - show labels instead
  if (isMobile) {
    return to ? (
      <Link
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all hover:bg-primary-500/10 dark:hover:bg-primary-500/10",
          isActive
            ? "bg-primary-500/15 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
            : "text-slate-500 dark:text-slate-400",
          isAction && "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10"
        )}
      >
        <motion.span
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            isActive
              ? "border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-950 dark:bg-primary-950/50 dark:text-primary-400"
              : "border-transparent bg-transparent text-white",
            isAction && "border-red-200 bg-red-50 text-red-600 dark:border-red-950 dark:bg-red-950/50 dark:text-red-400"
          )}
        >
          {icon}
        </motion.span>
        <span className="font-medium">{label}</span>
      </Link>
    ) : (
      <Button
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full flex justify-start items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all",
          isAction 
            ? "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10" 
            : "hover:bg-primary-500/10 dark:hover:bg-primary-500/10 text-slate-500 dark:text-slate-400"
        )}
      >
        <motion.span
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            isActive
              ? "border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-950 dark:bg-primary-950/50 dark:text-primary-400"
              : "border-transparent bg-transparent text-white",
            isAction && "border-red-200 bg-red-50 text-red-600 dark:border-red-950 dark:bg-red-950/50 dark:text-red-400"
          )}
        >
          {icon}
        </motion.span>
        <span className="font-medium">{label}</span>
      </Button>
    );
  }
  
  // Regular tooltip view for desktop
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {to ? (
            <Link
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary-500/10 dark:hover:bg-primary-500/10",
                isActive
                  ? "bg-primary-500/15 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-slate-500 dark:text-slate-400",
                isAction && "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10"
              )}
            >
              <motion.span
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border",
                  isActive
                    ? "border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-950 dark:bg-primary-950/50 dark:text-primary-400"
                    : "border-transparent bg-transparent text-white",
                  isAction && "border-red-200 bg-red-50 text-red-600 dark:border-red-950 dark:bg-red-950/50 dark:text-red-400"
                )}
              >
                {icon}
              </motion.span>
              <span className="font-medium">{label}</span>
            </Link>
          ) : (
            <Button
              variant="ghost"
              onClick={onClick}
              disabled={disabled}
              className={cn(
                "w-full flex justify-start items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                isAction 
                  ? "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10" 
                  : "hover:bg-primary-500/10 dark:hover:bg-primary-500/10 text-slate-500 dark:text-slate-400"
              )}
            >
              <motion.span
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border",
                  isActive
                    ? "border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-950 dark:bg-primary-950/50 dark:text-primary-400"
                    : "border-transparent bg-transparent text-white",
                  isAction && "border-red-200 bg-red-50 text-red-600 dark:border-red-950 dark:bg-red-950/50 dark:text-red-400"
                )}
              >
                {icon}
              </motion.span>
              <span className="font-medium">{label}</span>
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Toggle fullscreen mode by hiding the sidebar completely
  const toggleFullscreen = () => {
    // First store current sidebar state
    localStorage.setItem('sidebar-collapsed', String(collapsed));
    
    // Then set the hidden state
    const currentHiddenState = localStorage.getItem('sidebar-hidden') === 'true';
    localStorage.setItem('sidebar-hidden', String(!currentHiddenState));
    
    // Force page reload to ensure the new state is applied
    window.location.reload();
  };

  const isAdmin = user?.role === "admin";
  
  // For mobile, always show a more compact sidebar
  const effectivelyCollapsed = isMobile ? true : collapsed;

  return (
    <aside className={cn(
      "h-screen bg-slate-900/95 text-white border-r border-slate-800 flex flex-col transition-all duration-300 z-50",
      effectivelyCollapsed ? "w-16" : "w-64",
      isMobile && "shadow-lg"
    )}>
      <div className="h-16 border-b border-slate-800 flex items-center px-4 justify-between">
        {!effectivelyCollapsed ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-2"
          >
            <span className="font-bold text-lg bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Hassaniya
            </span>
            <span className="text-white/70">Transcriber</span>
          </motion.div>
        ) : (
          <div></div> // Empty div to maintain flex spacing
        )}
        
        {/* Fullscreen button right in the sidebar header - LARGE and VISIBLE */}
        <Button 
          variant="outline"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white border-primary-600 h-8 px-2"
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
          onClick={toggleFullscreen}
        >
          <PanelLeftClose className="h-5 w-5" />
          {!effectivelyCollapsed && <span className="ml-2">Fullscreen</span>}
        </Button>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <nav className={cn("flex flex-col gap-1", effectivelyCollapsed ? "px-2" : "px-3")}>
          <NavItem
            to="/"
            icon={<Home className="h-5 w-5 text-white" />}
            label="Dashboard"
            isActive={isPathActive("/")}
          />
          
          <NavItem
            to="/audio-processing"
            icon={<ListMusic className="h-5 w-5 text-white" />}
            label="Audio Processing"
            isActive={isPathActive("/audio-processing")}
          />
          
          <NavItem
            to="/transcriptions"
            icon={<FileText className="h-5 w-5 text-white" />}
            label="Transcription"
            isActive={isPathActive("/transcriptions")}
          />

          {isAdmin && (
            <>
              <div className={cn("mt-4 mb-2 px-2", effectivelyCollapsed ? "hidden" : "block")}>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Admin</div>
              </div>
              
              <NavItem
                to="/export"
                icon={<FolderArchive className="h-5 w-5 text-white" />}
                label="Export Data"
                isActive={isPathActive("/export")}
              />
              
              <NavItem
                to="/team"
                icon={<Users className="h-5 w-5 text-white" />}
                label="Manage Users"
                isActive={isPathActive("/team")}
              />
            </>
          )}
          
          {/* Large, VERY VISIBLE fullscreen button at the bottom of nav items */}
          <div className={cn("mt-6", effectivelyCollapsed ? "px-1" : "px-2")}>
            <Button 
              variant="default"
              className="w-full bg-primary hover:bg-primary/90 text-white border border-primary-600 flex items-center justify-center gap-2 h-10"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
              {!effectivelyCollapsed && <span>Toggle Fullscreen</span>}
            </Button>
          </div>
        </nav>
      </div>
      
      <div className="mt-auto border-t border-slate-800 p-4">
        {!effectivelyCollapsed ? (
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-400">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium">{user?.username || "User"}</div>
              <div className="text-xs text-slate-500">{user?.role || "Role"}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-400">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-2">
          <NavItem
            onClick={handleLogout}
            icon={logoutMutation.isPending ? 
              <div className="h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : 
              <LogOut className="h-5 w-5 text-red-400" />
            }
            label="Logout"
            isAction={true}
            disabled={logoutMutation.isPending}
          />
        </div>
      </div>
    </aside>
  );
}
