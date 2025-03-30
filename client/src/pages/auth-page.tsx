import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mic, Headphones, FileText, Download, Wand2, ExternalLink, ChevronsRight } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading, error } = useAuth();
  
  // Log authentication status for debugging
  console.log("Auth status:", { user, isLoading, error });
  
  // Force refetch on auth page to ensure correct state
  useEffect(() => {
    // Invalidate user query when auth page loads
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, []);
  
  // Redirect to dashboard if already logged in
  if (user && !isLoading) {
    console.log("User is authenticated, redirecting to dashboard");
    return <Redirect to="/" />;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "mirror" as "mirror",
      ease: "easeInOut"
    }
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2, 
      repeat: Infinity,
      repeatType: "mirror" as "mirror"
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Auth Form Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Hassaniya Arabic Transcription
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access the transcription platform
            </p>
          </div>
          <AuthForm />
          
          <div className="flex justify-center mt-6 pt-6 border-t border-gray-200">
            <a 
              href="https://github.com/Amin-tech99/hassany" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Project Repository
            </a>
          </div>
        </div>
      </div>

      {/* Hero/Info Column with Animations */}
      <div className="flex-1 bg-gradient-to-r from-primary-700 to-primary-900 p-8 flex flex-col justify-center text-white hidden md:flex relative overflow-hidden">
        {/* Animated black dots */}
        <div className="absolute inset-0 z-0">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-black rounded-full opacity-30"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`
              }}
              animate={{
                y: [0, Math.random() * 30 - 15, 0],
                x: [0, Math.random() * 30 - 15, 0],
                scale: [1, Math.random() * 1.5 + 0.5, 1]
              }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Infinity,
                repeatType: "mirror" as "mirror",
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Black interactive line connector */}
        <motion.div 
          className="absolute right-0 top-1/2 -translate-y-1/2 h-[80%] w-1 bg-black opacity-20 rounded-full"
          animate={{ height: ["70%", "80%", "70%"] }}
          transition={{ 
            duration: 7, 
            repeat: Infinity,
            repeatType: "mirror" as "mirror"
          }}
        />

        {/* Animated background circles */}
        <motion.div 
          className="absolute top-1/4 right-10 w-64 h-64 rounded-full bg-white opacity-5"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 10, 0],
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            repeatType: "mirror" as "mirror"
          }}
        />
        <motion.div 
          className="absolute bottom-20 left-0 w-80 h-80 rounded-full bg-white opacity-5"
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -10, 0],
            y: [0, 10, 0],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            repeatType: "mirror" as "mirror",
            delay: 0.5
          }}
        />

        <motion.div
          className="max-w-md mx-auto z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            className="text-4xl font-bold mb-8 text-white drop-shadow-md bg-black/40 px-4 py-2 rounded-lg inline-block"
            variants={itemVariants}
          >
            Collaborative Speech-to-Text Transcription
          </motion.h1>
          
          <motion.p 
            className="text-lg mb-6 text-white drop-shadow-md bg-black/30 p-3 rounded-md"
            variants={itemVariants}
          >
            A platform designed for teams to efficiently collect, process, and transcribe
            Hassaniya Arabic audio data for machine learning model training.
          </motion.p>
          
          {/* Platform highlights */}
          <motion.div 
            className="mb-8 bg-black/20 backdrop-blur-sm p-4 rounded-lg border border-white/20 shadow-lg"
            variants={itemVariants}
            custom={1}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center text-white drop-shadow-md">
              <span className="bg-black p-1 rounded-md mr-2">
                <Wand2 className="h-4 w-4 text-white" />
              </span>
              Platform Highlights
            </h3>
            <ul className="space-y-2 text-sm text-white">
              <motion.li 
                className="flex items-center" 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span className="h-2 w-2 rounded-full bg-white mr-2 flex-shrink-0"></span>
                Real-time collaboration between transcribers and reviewers
              </motion.li>
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <span className="h-2 w-2 rounded-full bg-white mr-2 flex-shrink-0"></span>
                Dialects, accents, and cultural context preservation
              </motion.li>
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <span className="h-2 w-2 rounded-full bg-white mr-2 flex-shrink-0"></span>
                Automated speech segmentation with manual adjustment tools
              </motion.li>
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                <span className="h-2 w-2 rounded-full bg-white mr-2 flex-shrink-0"></span>
                Customizable workflow stages for different project needs
              </motion.li>
            </ul>
          </motion.div>

          <div className="space-y-8 relative">
            {/* Floating icons on the side */}
            <div className="absolute -left-16 top-0 bottom-0 flex flex-col justify-around">
              <motion.div animate={floatingAnimation} className="bg-white/10 p-3 rounded-full">
                <Mic className="h-8 w-8 text-white" />
              </motion.div>
              <motion.div animate={floatingAnimation} transition={{ delay: 0.5 }} className="bg-white/10 p-3 rounded-full">
                <FileText className="h-8 w-8 text-white" />
              </motion.div>
              <motion.div animate={floatingAnimation} transition={{ delay: 1 }} className="bg-white/10 p-3 rounded-full">
                <Wand2 className="h-8 w-8 text-white" />
              </motion.div>
            </div>

            {/* Black corner accent */}
            <motion.div 
              className="absolute top-0 right-0 w-16 h-16" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <motion.path 
                  d="M0,0 L100,0 L100,100" 
                  stroke="black" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.2 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" as "mirror" }}
                />
              </svg>
            </motion.div>

            <motion.div 
              className="flex items-start p-4 rounded-lg bg-black/30 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">Streamlined Workflow</h3>
                <p className="text-white">Upload, segment, transcribe, and review audio in one seamless process</p>
              </div>
              <motion.div 
                className="ml-2 w-2 h-2 bg-white rounded-full opacity-60"
                animate={pulseAnimation}
              />
            </motion.div>
            
            <motion.div 
              className="flex items-start p-4 rounded-lg bg-black/30 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">Quality Control</h3>
                <p className="text-white">Multi-stage review process ensures high-quality transcriptions</p>
              </div>
              <motion.div 
                className="ml-2 w-2 h-2 bg-white rounded-full opacity-60"
                animate={pulseAnimation}
              />
            </motion.div>
            
            <motion.div 
              className="flex items-start p-4 rounded-lg bg-black/30 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">ML-Ready Export</h3>
                <p className="text-white">Export data in Whisper-compatible format for AI model training</p>
              </div>
              <motion.div 
                className="ml-2 w-2 h-2 bg-white rounded-full opacity-60"
                animate={pulseAnimation}
              />
            </motion.div>

            {/* Black interactive get started button */}
            <motion.div
              className="mt-12 text-center" 
              variants={itemVariants}
              custom={4}
            >
              <motion.button
                className="px-6 py-3 bg-black text-white rounded-lg inline-flex items-center shadow-lg hover:bg-gray-900 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.querySelector('.TabsTrigger[value="register"]')?.dispatchEvent(new Event('click', { bubbles: true }))}
              >
                Get Started <ChevronsRight className="ml-2 h-5 w-5" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
