import { Sidebar } from "./sidebar";
import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      
      {/* Main Content Area - Add padding to accommodate the fixed sidebar */}
      <div className="md:pl-72 pt-16 md:pt-0">
        {/* Main Content */}
        <main className="py-6 px-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
