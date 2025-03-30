import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mic, Headphones, FileText, Download, Wand2 } from "lucide-react";

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
        </div>
      </div>

      {/* Hero/Info Column with Animations */}
      <div className="flex-1 bg-gradient-to-r from-primary-700 to-primary-900 p-8 flex flex-col justify-center text-white hidden md:flex relative overflow-hidden">
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
            className="text-4xl font-bold mb-8"
            variants={itemVariants}
          >
            Collaborative Speech-to-Text Transcription
          </motion.h1>
          
          <motion.p 
            className="text-lg mb-12 text-white/90"
            variants={itemVariants}
          >
            A platform designed for teams to efficiently collect, process, and transcribe
            Hassaniya Arabic audio data for machine learning model training.
          </motion.p>

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

            <motion.div 
              className="flex items-start p-4 rounded-lg bg-white/10 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Streamlined Workflow</h3>
                <p className="text-white/80">Upload, segment, transcribe, and review audio in one seamless process</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start p-4 rounded-lg bg-white/10 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Quality Control</h3>
                <p className="text-white/80">Multi-stage review process ensures high-quality transcriptions</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start p-4 rounded-lg bg-white/10 backdrop-blur-sm shadow-xl transform transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-500 text-white mr-4">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">ML-Ready Export</h3>
                <p className="text-white/80">Export data in Whisper-compatible format for AI model training</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
