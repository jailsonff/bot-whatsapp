import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Wifi, WifiOff, Save, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: whatsappStatus } = useQuery({
    queryKey: ["/api/whatsapp/status"]
  });

  const updateWhatsappStatusMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/whatsapp/status", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({
        title: "Status atualizado",
        description: "Configurações do WhatsApp atualizadas com sucesso!"
      });
    }
  });

  const handleConnectWhatsapp = () => {
    updateWhatsappStatusMutation.mutate({ 
      isConnected: true, 
      lastConnected: new Date().toISOString() 
    });
  };

  const isConnected = (whatsappStatus as any)?.isConnected || false;

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            {isConnected ? (
              <Wifi className="mr-2 text-green-400" size={20} />
            ) : (
              <WifiOff className="mr-2 text-red-400" size={20} />
            )}
            Conexão WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Status da Conexão</p>
              <p className="text-sm text-gray-400">
                {isConnected ? "WhatsApp Web conectado" : "WhatsApp Web desconectado"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="text-green-400" size={20} />
                  <Badge className="bg-green-500/20 text-green-400">Conectado</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-400" size={20} />
                  <Badge className="bg-red-500/20 text-red-400">Desconectado</Badge>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {!isConnected && (
              <Button 
                className="btn-primary w-full"
                onClick={handleConnectWhatsapp}
                disabled={updateWhatsappStatusMutation.isPending}
              >
                <MessageCircle className="mr-2" size={16} />
                {updateWhatsappStatusMutation.isPending ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
            )}
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Como Conectar com o WhatsApp Real:</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Opção 1 - WhatsApp Business API (Recomendado):</strong></p>
                <p>• Mais profissional e estável</p>
                <p>• Requer aprovação do Meta/Facebook</p>
                <p>• Ideal para empresas grandes</p>
                
                <p className="mt-3"><strong>Opção 2 - WhatsApp Web (Mais Simples):</strong></p>
                <p>• Usa automação do WhatsApp Web</p>
                <p>• QR Code para conectar</p>
                <p>• Ideal para pequenos negócios</p>
                
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
                  <p className="text-yellow-400 font-medium">
                    Status Atual: Sistema em modo demonstração
                  </p>
                  <p className="text-yellow-300 text-sm mt-1">
                    Para conectar com WhatsApp real, será necessário implementar uma das APIs acima.
                    O botão "Conectar" simula uma conexão para demonstração.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white">Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Intervalo Padrão entre Mensagens (segundos)</Label>
            <Input
              type="number"
              min="1"
              max="300"
              defaultValue="5"
              className="bg-gray-700 border-gray-600 text-white mt-2"
            />
          </div>
          
          <div>
            <Label className="text-white">Máximo de Mensagens por Hora</Label>
            <Input
              type="number"
              min="1"
              max="1000"
              defaultValue="100"
              className="bg-gray-700 border-gray-600 text-white mt-2"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Modo Escuro</p>
              <p className="text-sm text-gray-400">Interface escura para melhor experiência</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white">Configurações de Exportação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Formato Padrão</Label>
            <Select defaultValue="csv">
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                <SelectValue placeholder="Selecione o formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Incluir Timestamps</p>
              <p className="text-sm text-gray-400">Adiciona data/hora nos exports</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}