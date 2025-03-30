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
  Menu,
  X,
  ChevronLeft,
  ChevronRight
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
import { motion, AnimatePresence } from "framer-motion";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  isAction?: boolean;
  disabled?: boolean;
  showTooltip?: boolean;
}

function NavItem({
  to,
  icon,
  label,
  isActive,
  onClick,
  isAction,
  disabled,
  showTooltip = true
}: NavItemProps) {
  const content = (
    <>
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
    </>
  );

  const itemClass = cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary-500/10 dark:hover:bg-primary-500/10",
    isActive
      ? "bg-primary-500/15 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
      : "text-slate-500 dark:text-slate-400",
    isAction && "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10"
  );

  const buttonClass = cn(
    "w-full flex justify-start items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
    isAction 
      ? "text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10" 
      : "hover:bg-primary-500/10 dark:hover:bg-primary-500/10 text-slate-500 dark:text-slate-400"
  );

  if (!showTooltip) {
    return to ? (
      <Link to={to} className={itemClass}>
        {content}
      </Link>
    ) : (
      <Button
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}
      >
        {content}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {to ? (
            <Link
              to={to}
              className={itemClass}
            >
              {content}
            </Link>
          ) : (
            <Button
              variant="ghost"
              onClick={onClick}
              disabled={disabled}
              className={buttonClass}
            >
              {content}
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

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (collapsed: boolean) => void }) {
  const location = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close sidebar on mobile when screen is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);
  
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isAdmin = user?.role === "admin";

  const sidebarContent = (
    <>
      <div className="h-16 border-b border-slate-800 flex items-center px-4 justify-between relative">
        {!collapsed && (
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
        )}
        
        {/* Mobile close button */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Toggle button - visible only on desktop */}
        <div className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-white border border-slate-700"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <nav className={cn("flex flex-col gap-1", collapsed ? "px-2" : "px-3")}>
          <NavItem
            to="/"
            icon={<Home className="h-5 w-5 text-white" />}
            label="Dashboard"
            isActive={isPathActive("/")}
            showTooltip={!mobileOpen && collapsed}
          />
          
          <NavItem
            to="/audio-processing"
            icon={<ListMusic className="h-5 w-5 text-white" />}
            label="Audio Processing"
            isActive={isPathActive("/audio-processing")}
            showTooltip={!mobileOpen && collapsed}
          />
          
          <NavItem
            to="/transcriptions"
            icon={<FileText className="h-5 w-5 text-white" />}
            label="Transcription"
            isActive={isPathActive("/transcriptions")}
            showTooltip={!mobileOpen && collapsed}
          />

          {isAdmin && (
            <>
              <div className={cn("mt-4 mb-2 px-2", (collapsed && !mobileOpen) ? "hidden" : "block")}>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Admin</div>
              </div>
              
              <NavItem
                to="/export"
                icon={<FolderArchive className="h-5 w-5 text-white" />}
                label="Export Data"
                isActive={isPathActive("/export")}
                showTooltip={!mobileOpen && collapsed}
              />
              
              <NavItem
                to="/team"
                icon={<Users className="h-5 w-5 text-white" />}
                label="Manage Users"
                isActive={isPathActive("/team")}
                showTooltip={!mobileOpen && collapsed}
              />
            </>
          )}
        </nav>
      </div>
      
      <div className="mt-auto border-t border-slate-800 p-4">
        {(!collapsed || mobileOpen) ? (
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-400">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-white">{user?.username || "User"}</div>
              <div className="text-xs text-slate-500">{user?.role || "Role"}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-400">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{user?.username}</p>
                  <p className="text-xs text-slate-400">{user?.role}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            showTooltip={!mobileOpen && collapsed}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu hamburger button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-slate-900/80 border-slate-700 text-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        "h-screen bg-slate-900/95 text-white border-r border-slate-800 flex flex-col transition-all duration-300 fixed z-50",
        "hidden md:flex", // Hide on mobile, show on desktop
        collapsed ? "w-16" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            
            {/* Mobile sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="h-screen w-64 bg-slate-900/95 text-white border-r border-slate-800 flex flex-col fixed z-50 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
