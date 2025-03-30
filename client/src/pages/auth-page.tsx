import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/auth-form";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { 
  Mic, Headphones, FileText, Download, Wand2, ExternalLink, 
  ChevronsRight, Braces, BarChart4, WavesIcon, FilesIcon
} from "lucide-react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  
  // Force refetch on auth page to ensure correct state
  useEffect(() => {
    // Invalidate user query when auth page loads
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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
      const count = 40;
      
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 4 + 1;
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
              top: `${posY}%`
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.5, 0],
              x: [0, Math.random() * 50 - 25],
              y: [0, Math.random() * 50 - 25]
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
        {generateStrands()}
        {generateParticles()}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* DNA Background Animation */}
      <DnaBackground />

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-4xl p-6 mx-auto grid md:grid-cols-2 gap-8 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left side - Branding */}
        <motion.div className="text-white space-y-6">
          <motion.div 
            className="space-y-3"
            variants={itemVariants}
          >
            <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Hassaniya Transcriber
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Modern platform for dialectal audio transcription, 
              analysis, and machine learning data preparation.
            </p>
          </motion.div>

          <motion.div 
            className="border-t border-white/10 pt-6"
            variants={itemVariants}
          >
            <h2 className="text-xl font-semibold mb-4">Platform Features</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Feature 1 */}
              <motion.div 
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <WavesIcon className="h-6 w-6 mb-2 text-primary-400" />
                <h3 className="font-medium">Audio Processing</h3>
                <p className="text-sm text-gray-400">Advanced segmentation and processing pipeline</p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Braces className="h-6 w-6 mb-2 text-primary-400" />
                <h3 className="font-medium">Collaborative</h3>
                <p className="text-sm text-gray-400">Multi-user transcription and review workflow</p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <BarChart4 className="h-6 w-6 mb-2 text-primary-400" />
                <h3 className="font-medium">Dialectal Intelligence</h3>
                <p className="text-sm text-gray-400">Specialized for Hassaniya dialect transcription</p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div 
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <FilesIcon className="h-6 w-6 mb-2 text-primary-400" />
                <h3 className="font-medium">ML-Ready Export</h3>
                <p className="text-sm text-gray-400">Export data for machine learning tasks</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Tech stack */}
          <motion.div 
            variants={itemVariants} 
            className="pt-4 flex items-center gap-4 text-white/40 text-sm"
          >
            <span>Built with:</span>
            <span className="px-2 py-1 bg-white/5 rounded-md">React</span>
            <span className="px-2 py-1 bg-white/5 rounded-md">TypeScript</span>
            <span className="px-2 py-1 bg-white/5 rounded-md">Node.js</span>
          </motion.div>
        </motion.div>

        {/* Right side - Auth Form */}
        <motion.div 
          variants={itemVariants}
          className="backdrop-blur-md bg-black/20 p-6 rounded-xl border border-white/10 shadow-xl"
        >
          <AuthForm />
        </motion.div>
      </motion.div>
    </div>
  );
}
