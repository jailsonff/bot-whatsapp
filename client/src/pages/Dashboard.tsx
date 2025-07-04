import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Bot, TrendingUp, Download, Settings, Plus } from "lucide-react";

export default function Dashboard() {
  // Buscar métricas do sistema
  const { data: metrics = {} } = useQuery({
    queryKey: ["/api/metrics"]
  });

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Contatos Ativos</CardTitle>
            <CardDescription className="text-gray-400">
              Total de contatos ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.activeContacts || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Mensagens Enviadas</CardTitle>
            <CardDescription className="text-gray-400">
              Total de mensagens enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.messagesSent || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Automações Ativas</CardTitle>
            <CardDescription className="text-gray-400">
              Total de automações ativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.activeAutomations || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Taxa de Conversão</CardTitle>
            <CardDescription className="text-gray-400">
              Média de conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.conversionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Ações Rápidas</CardTitle>
          <CardDescription className="text-gray-400">
            Ações mais comuns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Novo Contato
            </Button>
            <Button variant="outline" className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Nova Conversa
            </Button>
            <Button variant="outline" className="w-full">
              <Bot className="mr-2 h-4 w-4" />
              Nova Automação
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Atividade Recente</CardTitle>
          <CardDescription className="text-gray-400">
            Últimas atividades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Eventos do sistema serão listados aqui */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
