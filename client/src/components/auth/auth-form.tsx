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
import { Loader2, User, Lock, Mail, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
        duration: 0.3, 
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
      className="w-full max-w-md"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 rounded-lg bg-gray-100 shadow-md">
        <TabsTrigger 
          value="login" 
          className={cn(
            "rounded-md data-[state=active]:bg-white data-[state=active]:text-primary-700 font-medium text-base",
            "transition-all duration-300 data-[state=active]:shadow-md",
            "border-none hover:bg-gray-200 data-[state=active]:font-bold"
          )}
        >
          <User className="h-4 w-4 mr-2" />
          <span>Login</span>
        </TabsTrigger>
        <TabsTrigger 
          value="register" 
          className={cn(
            "rounded-md data-[state=active]:bg-white data-[state=active]:text-primary-700 font-medium text-base",
            "transition-all duration-300 data-[state=active]:shadow-md",
            "border-none hover:bg-gray-200 data-[state=active]:font-bold"
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
          className="bg-white p-6 rounded-lg shadow-lg border border-gray-200"
        >
          <motion.h3 
            className="text-lg font-bold text-gray-800 mb-6 text-center"
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
                      <FormLabel className="text-slate-700">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input placeholder="Enter your username" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-slate-700">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input type="password" placeholder="Enter your password" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={2} initial="hidden" animate="visible">
                <Button 
                  type="submit" 
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-md transition-all shadow-lg hover:shadow-xl border-2 border-white text-lg font-bold" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </motion.div>

              {/* Login help text */}
              <motion.p 
                className="text-xs text-center text-gray-500 mt-4"
                variants={inputVariants}
                custom={3}
                initial="hidden"
                animate="visible"
              >
                Click the button above to sign in
              </motion.p>
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
          className="bg-white p-6 rounded-lg shadow-lg border border-gray-200"
        >
          <motion.h3 
            className="text-lg font-bold text-gray-800 mb-6 text-center"
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
                      <FormLabel className="text-slate-700">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input placeholder="Enter your full name" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-slate-700">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input placeholder="Choose a username" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-slate-700">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input type="password" placeholder="Create a password" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel className="text-slate-700">Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border border-slate-200 focus:ring-2 focus:ring-primary-200">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg">
                          <SelectItem value="transcriber">Transcriber</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="collector">Audio Collector</SelectItem>
                          <SelectItem value="admin">Team Leader</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={inputVariants} custom={4} initial="hidden" animate="visible">
                <Button 
                  type="submit" 
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-md transition-all shadow-lg hover:shadow-xl border-2 border-white text-lg font-bold" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </motion.div>

              {/* Register help text */}
              <motion.p 
                className="text-xs text-center text-gray-500 mt-4"
                variants={inputVariants}
                custom={5}
                initial="hidden"
                animate="visible"
              >
                Click the button above to create your account
              </motion.p>
            </form>
          </Form>
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
