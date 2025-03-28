import { Sidebar } from "./sidebar";
import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="md:pl-64">
        {/* Main Content */}
        <main className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
