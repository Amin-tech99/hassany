import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/auth-form";
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { 
  Mic, Headphones, FileText, Download, Wand2, ExternalLink, 
  ChevronsRight, Braces, BarChart4, WavesIcon, FilesIcon
} from "lucide-react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Force refetch on auth page to ensure correct state
  useEffect(() => {
    // Invalidate user query when auth page loads
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // DNA Animation component
  const DnaBackground = () => {
    // Generate DNA strands
    const generateStrands = () => {
      // Reduce strands on mobile for better performance
      const count = isMobile ? 4 : 8;
      const strands = [];
      for (let i = 0; i < count; i++) {
        strands.push(
          <motion.div
            key={`strand-${i}`}
            className="absolute h-full"
            style={{
              left: `${10 + i * (isMobile ? 24 : 12)}%`,
              width: '1px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.15), rgba(255,255,255,0.02))'
            }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: '100%', 
              opacity: 1,
              filter: 'blur(0.5px)'
            }}
            transition={{ 
              duration: 2.5,
              delay: i * 0.15,
              ease: "easeOut"
            }}
          />
        );
      }
      return strands;
    };

    // Generate connecting elements
    const generateConnectors = () => {
      const connectors = [];
      // Reduce connectors on mobile for better performance
      const count = isMobile ? 15 : 30;
      
      for (let i = 0; i < count; i++) {
        const posY = 5 + (i * 90 / count);
        const width = Math.random() * 15 + 5;
        const delay = Math.random() * 3;
        const xOffset = Math.floor(i / 3) % (isMobile ? 4 : 8);
        const left = 10 + xOffset * (isMobile ? 24 : 12);
        
        connectors.push(
          <motion.div
            key={`connector-${i}`}
            className="absolute h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{
              width: `${width}%`,
              left: `${left}%`,
              top: `${posY}%`,
            }}
            initial={{ opacity: 0, width: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              width: [`${width}%`],
              x: i % 2 === 0 ? [0, 20, 0] : [0, -20, 0],
            }}
            transition={{ 
              duration: 5 + Math.random() * 3,
              delay,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        );
      }
      
      return connectors;
    };

    // Generate particles
    const generateParticles = () => {
      const particles = [];
      // Reduce particles on mobile for better performance
      const count = isMobile ? 30 : 60;
      
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 4 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 15 + 10;
        
        particles.push(
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-primary-400/20"
            style={{
              width: size,
              height: size,
              left: `${posX}%`,
              top: `${posY}%`
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.7, 0],
              x: [0, Math.random() * 70 - 35],
              y: [0, Math.random() * 70 - 35]
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/30" />
        {generateStrands()}
        {generateConnectors()}
        {generateParticles()}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {/* DNA Background Animation */}
      <DnaBackground />

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-5xl p-4 md:p-6 mx-auto grid md:grid-cols-2 gap-6 md:gap-10 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left side - Branding (Hidden on mobile, will appear below form) */}
        <motion.div className={`text-white space-y-6 md:space-y-8 ${isMobile ? 'order-2' : ''}`}>
          <motion.div 
            className="space-y-3 md:space-y-4"
            variants={itemVariants}
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Hassaniya Transcriber
            </h1>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              Modern platform for dialectal audio transcription, 
              analysis, and machine learning data preparation.
            </p>
          </motion.div>

          {!isMobile && (
            <motion.div 
              className="border-t border-white/10 pt-6"
              variants={itemVariants}
            >
              <h2 className="text-xl font-semibold mb-4">Platform Features</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Feature 1 */}
                <motion.div 
                  className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <WavesIcon className="h-6 w-6 mb-2 text-primary-400" />
                  <h3 className="font-medium">Audio Processing</h3>
                  <p className="text-sm text-gray-400">Advanced segmentation and processing pipeline</p>
                </motion.div>

                {/* Feature 2 */}
                <motion.div 
                  className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Braces className="h-6 w-6 mb-2 text-primary-400" />
                  <h3 className="font-medium">Collaborative</h3>
                  <p className="text-sm text-gray-400">Multi-user transcription and review workflow</p>
                </motion.div>

                {/* Feature 3 */}
                <motion.div 
                  className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <BarChart4 className="h-6 w-6 mb-2 text-primary-400" />
                  <h3 className="font-medium">Dialectal Intelligence</h3>
                  <p className="text-sm text-gray-400">Specialized for Hassaniya dialect transcription</p>
                </motion.div>

                {/* Feature 4 */}
                <motion.div 
                  className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <FilesIcon className="h-6 w-6 mb-2 text-primary-400" />
                  <h3 className="font-medium">ML-Ready Export</h3>
                  <p className="text-sm text-gray-400">Export data for machine learning tasks</p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Tech stack - hide on mobile */}
          {!isMobile && (
            <motion.div 
              variants={itemVariants} 
              className="pt-4 flex items-center gap-4 text-white/50 text-sm"
            >
              <span>Built with:</span>
              <span className="px-2 py-1 bg-black/40 rounded-md">React</span>
              <span className="px-2 py-1 bg-black/40 rounded-md">Node.js</span>
              <span className="px-2 py-1 bg-black/40 rounded-md">Tailwind</span>
            </motion.div>
          )}
        </motion.div>

        {/* Right side - Auth Form */}
        <motion.div 
          variants={itemVariants}
          className={`flex justify-center ${isMobile ? 'order-1' : ''}`}
        >
          <div className="w-full max-w-md p-5 md:p-8 bg-black/30 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-sm text-gray-400 mt-1">Log in to your account to continue</p>
            </div>
            <AuthForm />
          </div>
        </motion.div>

        {/* Mobile features section - simplified version */}
        {isMobile && (
          <motion.div 
            className="border-t border-white/10 pt-4 text-white space-y-4 order-3"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold">Key Features</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <WavesIcon className="h-5 w-5 mb-1 text-primary-400" />
                <h3 className="font-medium text-sm">Audio Processing</h3>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <Braces className="h-5 w-5 mb-1 text-primary-400" />
                <h3 className="font-medium text-sm">Collaborative</h3>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <BarChart4 className="h-5 w-5 mb-1 text-primary-400" />
                <h3 className="font-medium text-sm">Dialectal AI</h3>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <FilesIcon className="h-5 w-5 mb-1 text-primary-400" />
                <h3 className="font-medium text-sm">ML-Ready Export</h3>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
