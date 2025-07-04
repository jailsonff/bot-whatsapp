import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Bot, TrendingUp, Download, Settings, Plus, Radio } from "lucide-react";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"]
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"]
  });

  const { data: automations } = useQuery({
    queryKey: ["/api/automations"]
  });

  const { data: broadcasts } = useQuery({
    queryKey: ["/api/broadcasts"]
  });

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Contatos Ativos</p>
                <p className="text-2xl font-bold text-white">{stats?.activeContacts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Users className="text-primary" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-400 mr-1" size={16} />
              <span className="text-green-400">+12%</span>
              <span className="text-gray-400 ml-1">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Mensagens Enviadas</p>
                <p className="text-2xl font-bold text-white">{stats?.messagesSent || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-400 mr-1" size={16} />
              <span className="text-green-400">+8%</span>
              <span className="text-gray-400 ml-1">hoje</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Automações Ativas</p>
                <p className="text-2xl font-bold text-white">{stats?.activeAutomations || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Bot className="text-purple-400" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-yellow-400">Estável</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-white">{stats?.conversionRate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-400 mr-1" size={16} />
              <span className="text-green-400">+5.2%</span>
              <span className="text-gray-400 ml-1">esta semana</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 surface-dark border">
          <CardHeader>
            <CardTitle className="text-white">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <MessageSquare className="text-white" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Nova mensagem recebida</p>
                  <p className="text-gray-400 text-sm">Sistema em funcionamento</p>
                </div>
                <span className="text-gray-400 text-sm">há 2 min</span>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="text-white" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Automação executada</p>
                  <p className="text-gray-400 text-sm">Resposta automática enviada</p>
                </div>
                <span className="text-gray-400 text-sm">há 5 min</span>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Radio className="text-white" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Disparo em massa iniciado</p>
                  <p className="text-gray-400 text-sm">Campanha de marketing</p>
                </div>
                <span className="text-gray-400 text-sm">há 1h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="surface-dark border">
          <CardHeader>
            <CardTitle className="text-white">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full btn-primary text-left justify-start">
                <Plus className="mr-3" size={16} />
                Novo Contato
              </Button>
              <Button className="w-full btn-secondary text-left justify-start">
                <Radio className="mr-3" size={16} />
                Disparo Rápido
              </Button>
              <Button className="w-full btn-secondary text-left justify-start">
                <Download className="mr-3" size={16} />
                Exportar Contatos
              </Button>
              <Button className="w-full btn-secondary text-left justify-start">
                <Settings className="mr-3" size={16} />
                Configurar Bot
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
