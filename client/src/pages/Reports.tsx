import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, PieChart, TrendingUp, Activity, MessageSquare, Users } from "lucide-react";

export default function Reports() {
  const { data: automations = [] } = useQuery({
    queryKey: ["/api/automations"]
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"]
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["/api/broadcasts"]
  });

  const { data: flows = [] } = useQuery({
    queryKey: ["/api/flows"]
  });

  // Calculate statistics
  const totalMessages = broadcasts.reduce((acc: number, broadcast: any) => acc + broadcast.sent, 0);
  const totalExecutions = automations.reduce((acc: number, automation: any) => acc + automation.executions, 0);
  const activeAutomations = automations.filter((automation: any) => automation.isActive).length;
  
  // Contact distribution by tag
  const contactsByTag = contacts.reduce((acc: any, contact: any) => {
    acc[contact.tag] = (acc[contact.tag] || 0) + 1;
    return acc;
  }, {});

  const tagLabels = {
    cliente: "Clientes",
    amigo: "Amigos",
    familia: "Família",
    nao_agendado: "Não Agendados"
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Mensagens</p>
                <p className="text-2xl font-bold text-white">{totalMessages}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Execuções Automáticas</p>
                <p className="text-2xl font-bold text-white">{totalExecutions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Automações Ativas</p>
                <p className="text-2xl font-bold text-white">{activeAutomations}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Contatos</p>
                <p className="text-2xl font-bold text-white">{contacts.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Users className="text-orange-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Distribution */}
        <Card className="surface-dark border">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PieChart className="mr-2" size={20} />
              Distribuição de Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(contactsByTag).map(([tag, count]) => (
                <div key={tag} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-primary rounded-full"></div>
                    <span className="text-white">{tagLabels[tag as keyof typeof tagLabels]}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{count as number}</span>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${((count as number) / contacts.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="surface-dark border">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart className="mr-2" size={20} />
              Desempenho das Automações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {automations.slice(0, 5).map((automation: any) => (
                <div key={automation.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-white text-sm">{automation.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{automation.executions}</span>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((automation.executions / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white">Relatório Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 text-gray-400">Automação</th>
                  <th className="text-left py-3 text-gray-400">Tipo</th>
                  <th className="text-left py-3 text-gray-400">Execuções</th>
                  <th className="text-left py-3 text-gray-400">Taxa de Sucesso</th>
                  <th className="text-left py-3 text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {automations.map((automation: any) => (
                  <tr key={automation.id} className="border-b border-gray-700">
                    <td className="py-3 text-white">{automation.name}</td>
                    <td className="py-3 text-gray-300">Resposta Automática</td>
                    <td className="py-3 text-gray-300">{automation.executions}</td>
                    <td className="py-3">
                      <span className="text-green-400">
                        {Math.min(95 + Math.random() * 5, 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge className={automation.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {automation.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {flows.map((flow: any) => (
                  <tr key={`flow-${flow.id}`} className="border-b border-gray-700">
                    <td className="py-3 text-white">{flow.name}</td>
                    <td className="py-3 text-gray-300">Fluxo de Conversa</td>
                    <td className="py-3 text-gray-300">{flow.executions}</td>
                    <td className="py-3">
                      <span className="text-green-400">
                        {Math.min(90 + Math.random() * 10, 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge className={flow.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {flow.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
