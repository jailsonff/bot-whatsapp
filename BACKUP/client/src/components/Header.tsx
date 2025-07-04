import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";

const sectionTitles = {
  "/": { title: "Dashboard", subtitle: "Visão geral das suas automações" },
  "/contacts": { title: "Gerenciar Contatos", subtitle: "Organize e gerencie seus contatos" },
  "/automation": { title: "Automações", subtitle: "Configure respostas automáticas" },
  "/broadcasts": { title: "Disparos em Massa", subtitle: "Envie mensagens para múltiplos contatos" },
  "/flows": { title: "Fluxos de Conversa", subtitle: "Configure fluxos automatizados" },
  "/reports": { title: "Relatórios", subtitle: "Analise o desempenho das automações" },
  "/settings": { title: "Configurações", subtitle: "Ajuste as opções do sistema" }
};

export default function Header() {
  const [location] = useLocation();
  const sectionInfo = sectionTitles[location as keyof typeof sectionTitles] || sectionTitles["/"];

  return (
    <header className="bg-gray-800 border-b border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{sectionInfo.title}</h2>
          <p className="text-gray-400">{sectionInfo.subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button className="btn-primary">
            <Plus size={16} className="mr-2" />
            Nova Automação
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="w-10 h-10 bg-gray-700 rounded-full hover:bg-gray-600">
              <Bell size={20} className="text-gray-300" />
            </Button>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">3</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
