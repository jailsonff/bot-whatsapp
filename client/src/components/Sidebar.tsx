import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  MessageSquare, 
  Users, 
  Bot, 
  GitBranch, 
  BarChart, 
  Settings,
  LayoutDashboard,
  CheckCircle,
  AlertCircle,
  Power
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Conversas", href: "/conversations", icon: MessageSquare },
  { name: "Automações", href: "/automation", icon: Bot },
  { name: "Fluxos de Conversa", href: "/flows", icon: GitBranch },
  { name: "Relatórios", href: "/reports", icon: BarChart },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [loading, setLoading] = useState(false);
  const { data: whatsappStatus } = useQuery({
    queryKey: ["/api/whatsapp/status"]
  });

  const { connectionStatus } = useWebSocket();

  // Função para desconectar WhatsApp
  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/whatsapp/restart", {});
      setTimeout(() => {
        setLoading(false);
        // Recarregar página para atualizar status
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">WhatsApp SaaS</h1>
            <p className="text-sm text-gray-400">Automações Inteligentes</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Status */}
      <div className="p-4 border-t border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {(whatsappStatus as any)?.isConnected ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {(whatsappStatus as any)?.isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              </p>
              <p className="text-xs text-gray-400">
                {(whatsappStatus as any)?.isConnected ? `Online - ${connectionStatus}` : 'Offline'}
              </p>
            </div>
          </div>
          
          {/* Botão Desconectar - aparece apenas quando conectado */}
          {(whatsappStatus as any)?.isConnected && (
            <Button
              onClick={handleDisconnect}
              disabled={loading}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            >
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
