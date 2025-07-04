import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";

const pageInfo: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Visão geral do sistema" },
  "/contacts": { title: "Contatos", subtitle: "Gerencie seus contatos" },
  "/conversations": { title: "Conversas", subtitle: "Gerencie suas conversas" },
  "/automation": { title: "Automações", subtitle: "Configure respostas automáticas" },
  "/broadcasts": { title: "Disparos em Massa", subtitle: "Envie mensagens para múltiplos contatos" },
  "/flows": { title: "Fluxos de Conversa", subtitle: "Configure fluxos de conversa" },
  "/reports": { title: "Relatórios", subtitle: "Visualize estatísticas e relatórios" },
  "/settings": { title: "Configurações", subtitle: "Configure o sistema" },
};

export default function Header() {
  const [location] = useLocation();
  const sectionInfo = pageInfo[location as keyof typeof pageInfo] || pageInfo["/"];

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{sectionInfo.title}</h1>
          <p className="text-gray-400">{sectionInfo.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
