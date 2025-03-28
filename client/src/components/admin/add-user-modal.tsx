import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Form schema for adding or editing a user
const userFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["transcriber", "reviewer", "collector", "admin"], {
    errorMap: () => ({ message: "Invalid role selected" }),
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | null;
}

export function AddUserModal({ isOpen, onClose, userId }: AddUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = userId !== null && userId !== undefined;
  
  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
      role: "transcriber",
    },
  });
  
  // Fetch user data if editing
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: isEditing && isOpen,
  });
  
  // Set form values when user data is loaded
  useEffect(() => {
    if (userData && isEditing) {
      form.reset({
        fullName: userData.fullName,
        username: userData.username,
        role: userData.role,
        // Don't populate password when editing
        password: undefined,
      });
    } else if (!isEditing) {
      form.reset({
        fullName: "",
        username: "",
        password: "",
        role: "transcriber",
      });
    }
  }, [userData, isEditing, form]);
  
  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      return apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User added",
        description: "The user has been successfully added.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      if (!userId) throw new Error("User ID is required for updates");
      
      // Remove password if empty
      if (!data.password) {
        const { password, ...userData } = data;
        return apiRequest("PATCH", `/api/users/${userId}`, userData);
      }
      
      return apiRequest("PATCH", `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission
  const onSubmit = (values: UserFormValues) => {
    if (isEditing) {
      updateUserMutation.mutate(values);
    } else {
      // Password is required when adding a new user
      if (!values.password) {
        toast({
          title: "Password required",
          description: "Please provide a password for the new user.",
          variant: "destructive",
        });
        return;
      }
      
      addUserMutation.mutate(values);
    }
  };
  
  const isPending = addUserMutation.isPending || updateUserMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
        </DialogHeader>
        
        {isEditing && isLoadingUser ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditing ? "Password (leave blank to keep current)" : "Password"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isEditing ? "Enter new password" : "Enter password"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || isLoadingUser}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    isEditing ? "Update User" : "Add User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
