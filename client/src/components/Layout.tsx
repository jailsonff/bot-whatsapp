import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex bg-gray-900 text-gray-100 min-h-0 h-auto">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 h-auto">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto min-h-0 h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
