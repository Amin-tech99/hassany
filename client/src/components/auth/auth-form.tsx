import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginSchema, registerSchema } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Lock, Mail, UserCheck, AtSign, KeyRound, UserCog } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// DNA helix animation component
const DnaAnimation = () => {
  return (
    <div className="absolute -right-16 h-full w-20 overflow-hidden opacity-40 pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-16 flex justify-between"
          style={{ top: `${i * 8}%` }}
          animate={{ 
            x: i % 2 === 0 ? [0, 10, 0] : [0, -10, 0],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 3 + (i % 3), 
            repeat: Infinity, 
            repeatType: "mirror" 
          }}
        >
          <motion.div 
            className="h-2 w-2 rounded-full bg-primary-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div 
            className="h-2 w-2 rounded-full bg-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
          />
        </motion.div>
      ))}
    </div>
  );
};

export function AuthForm() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { loginMutation, registerMutation } = useAuth();
  
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: "easeOut" 
      }
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      transition: { 
        duration: 0.2 
      } 
    }
  };
  
  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.3
      }
    })
  };

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "transcriber",
    },
  });

  // Submit handlers
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  return (
    <Tabs
      defaultValue="login"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "login" | "register")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
        <TabsTrigger 
          value="login" 
          className={cn(
            "rounded-md data-[state=active]:bg-primary-600 data-[state=active]:text-white font-medium text-base",
            "transition-all duration-300 text-gray-300 data-[state=active]:font-bold data-[state=active]:shadow-lg",
            "border-none hover:bg-white/10"
          )}
        >
          <User className="h-4 w-4 mr-2" />
          <span>Login</span>
        </TabsTrigger>
        <TabsTrigger 
          value="register" 
          className={cn(
            "rounded-md data-[state=active]:bg-primary-600 data-[state=active]:text-white font-medium text-base",
            "transition-all duration-300 text-gray-300 data-[state=active]:font-bold data-[state=active]:shadow-lg",
            "border-none hover:bg-white/10"
          )}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          <span>Register</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          key="login-form"
          className="relative backdrop-blur-sm bg-black/30 p-6 rounded-lg border border-white/10 overflow-hidden"
        >
          <DnaAnimation />
          
          <motion.h3 
            className="text-lg font-bold text-white mb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Welcome Back
          </motion.h3>
          
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <motion.div variants={inputVariants} custom={0} initial="hidden" animate="visible">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-3 h-4 w-4 text-primary-400" />
                          <Input 
                            placeholder="Enter your username" 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-primary-500" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={1} initial="hidden" animate="visible">
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-primary-400" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-primary-500" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={2} initial="hidden" animate="visible">
                <Button 
                  type="submit" 
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-white py-5 rounded-md shadow-lg font-semibold text-base" 
                  disabled={loginMutation.isPending}
                >
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        className="h-full w-1/5 bg-white opacity-0 group-hover:opacity-10"
                        initial={false}
                        animate={{ 
                          height: ["0%", "100%", "0%"],
                          opacity: [0, 0.1, 0]
                        }}
                        transition={{ 
                          duration: 1.5 + Math.random() * 1,
                          delay: i * 0.1,
                          repeat: Infinity,
                          repeatDelay: Math.random() * 2
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">Sign in</span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </TabsContent>

      <TabsContent value="register">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          key="register-form"
          className="relative backdrop-blur-sm bg-black/30 p-6 rounded-lg border border-white/10"
        >
          <DnaAnimation />
          
          <motion.h3 
            className="text-lg font-bold text-white mb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Create an Account
          </motion.h3>
          
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
              <motion.div variants={inputVariants} custom={0} initial="hidden" animate="visible">
                <FormField
                  control={registerForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-primary-400" />
                          <Input 
                            placeholder="Enter your full name" 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-primary-500" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={1} initial="hidden" animate="visible">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-3 h-4 w-4 text-primary-400" />
                          <Input 
                            placeholder="Choose a username" 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-primary-500" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={2} initial="hidden" animate="visible">
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-primary-400" />
                          <Input 
                            type="password" 
                            placeholder="Create a password" 
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-primary-500" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={3} initial="hidden" animate="visible">
                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <div className="relative">
                            <UserCog className="absolute left-3 top-3 h-4 w-4 text-primary-400 z-10" />
                            <SelectTrigger className="pl-10 bg-white/10 border-white/20 text-white focus-visible:ring-primary-500">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-white/10 text-white">
                          <SelectItem value="transcriber" className="focus:bg-primary-700">Transcriber</SelectItem>
                          <SelectItem value="reviewer" className="focus:bg-primary-700">Reviewer</SelectItem>
                          <SelectItem value="admin" className="focus:bg-primary-700">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={4} initial="hidden" animate="visible">
                <Button 
                  type="submit" 
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-500 hover:to-primary-700 text-white py-5 rounded-md shadow-lg font-semibold text-base" 
                  disabled={registerMutation.isPending}
                >
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        className="h-full w-1/5 bg-white opacity-0 group-hover:opacity-10"
                        initial={false}
                        animate={{ 
                          height: ["0%", "100%", "0%"],
                          opacity: [0, 0.1, 0]
                        }}
                        transition={{ 
                          duration: 1.5 + Math.random() * 1,
                          delay: i * 0.1,
                          repeat: Infinity,
                          repeatDelay: Math.random() * 2
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </div>
                </Button>
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
