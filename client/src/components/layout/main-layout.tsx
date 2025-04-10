import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    // Reduced particle count for better mobile performance
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

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Save preference when changed
  const handleCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  };

  // Load preference on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
      {/* DNA Background Animation with reduced opacity for better readability */}
      <DnaBackground />
      
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={handleCollapseChange} />
      
      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 relative z-10",
        sidebarCollapsed ? "md:pl-16" : "md:pl-64"
      )}>
        {/* Main Content */}
        <main className="py-4 md:py-6 px-4 md:px-6">
          <div className="backdrop-blur-sm bg-black/10 rounded-xl border border-white/5 shadow-xl p-3 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
