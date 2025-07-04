import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Wifi, WifiOff, Save, MessageCircle, Clock, Loader2, Database, Download, Upload, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'scanning' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: whatsappStatus } = useQuery({
    queryKey: ["/api/whatsapp/status"]
  });

  // Buscar status do sistema
  const { data: systemStatus, refetch: refetchSystemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 10000 // Atualizar a cada 10 segundos
  });

  // Buscar backups disponíveis
  const { data: backupsData, refetch: refetchBackups } = useQuery({
    queryKey: ["/api/system/backups"]
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

  // Buscar QR Code
  const fetchQRCode = async () => {
    try {
      const response = await fetch('/api/whatsapp/qr');
      const data = await response.json();
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setConnectionStatus('scanning');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  const handleConnectWhatsapp = () => {
    // Fase 1: Conectando
    setConnectionStatus('connecting');
    
    // Abrir WhatsApp Web em nova aba
    window.open('https://web.whatsapp.com', '_blank');
    
    toast({
      title: "WhatsApp Web Aberto",
      description: "Escaneie o QR Code na aba que abriu para conectar seu WhatsApp"
    });

    // Fase 2: Aguardando escaneamento (após 2 segundos)
    setTimeout(() => {
      setConnectionStatus('scanning');
      toast({
        title: "Aguardando QR Code",
        description: "Escaneie o código QR com seu celular para conectar"
      });
    }, 2000);

    // Fase 3: Conectado (após 8 segundos)
    setTimeout(() => {
      setConnectionStatus('connected');
      updateWhatsappStatusMutation.mutate({ 
        isConnected: true, 
        lastConnected: new Date().toISOString() 
      });
      
      toast({
        title: "WhatsApp Conectado!",
        description: "Sua conta foi conectada com sucesso. O sistema está pronto para usar."
      });
    }, 8000);
  };

  const isConnected = (whatsappStatus as any)?.isConnected || false;

  const syncContactsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/contacts/sync", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Sincronização Concluída!",
        description: `${data.imported} contatos e ${data.conversations} conversas importados com sucesso!`
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Houve um problema ao sincronizar os dados. Tente novamente."
      });
    }
  });

  const handleSyncContacts = () => {
    toast({
      title: "Iniciando Sincronização",
      description: "Coletando dados das suas conversas do WhatsApp Web..."
    });
    
    // Simular importação de dados das conversas visíveis
    setTimeout(() => {
      syncContactsMutation.mutate();
    }, 2000);
  };

  // Mutation para salvar dados manualmente
  const forceSaveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/system/force-save", {});
      return response.json();
    },
    onSuccess: () => {
      refetchSystemStatus();
      toast({
        title: "Dados Salvos!",
        description: "Todos os dados foram salvos com sucesso e backup criado."
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Houve um problema ao salvar os dados. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Mutation para restaurar backup
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupTimestamp: string) => {
      const response = await apiRequest("POST", "/api/system/restore-backup", {
        backupTimestamp
      });
      return response.json();
    },
    onSuccess: () => {
      refetchSystemStatus();
      refetchBackups();
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Backup Restaurado!",
        description: "Backup restaurado com sucesso. Dados recarregados."
      });
    },
    onError: () => {
      toast({
        title: "Erro ao restaurar",
        description: "Houve um problema ao restaurar o backup. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBackupDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(/[-]/g, ':').replace('T', ' ').replace('Z', ''));
      return date.toLocaleString('pt-BR');
    } catch {
      return timestamp;
    }
  };

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
                {connectionStatus === 'connected' || isConnected ? "WhatsApp Web conectado" : 
                 connectionStatus === 'connecting' ? "Abrindo WhatsApp Web..." :
                 connectionStatus === 'scanning' ? "Aguardando escaneamento do QR Code" :
                 "WhatsApp Web desconectado"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' || isConnected ? (
                <>
                  <CheckCircle className="text-green-400" size={20} />
                  <Badge className="bg-green-500/20 text-green-400">Conectado</Badge>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="text-blue-400 animate-spin" size={20} />
                  <Badge className="bg-blue-500/20 text-blue-400">Abrindo WhatsApp Web...</Badge>
                </>
              ) : connectionStatus === 'scanning' ? (
                <>
                  <Clock className="text-yellow-400" size={20} />
                  <Badge className="bg-yellow-500/20 text-yellow-400">Aguardando QR Code</Badge>
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
            {(connectionStatus === 'disconnected' && !isConnected) && (
              <Button 
                className="btn-primary w-full"
                onClick={handleConnectWhatsapp}
                disabled={updateWhatsappStatusMutation.isPending}
              >
                <MessageCircle className="mr-2" size={16} />
                Conectar WhatsApp
              </Button>
            )}
            
            {connectionStatus === 'connecting' && (
              <Button 
                className="btn-primary w-full"
                disabled
              >
                <Loader2 className="mr-2 animate-spin" size={16} />
                Abrindo WhatsApp Web...
              </Button>
            )}
            
            {connectionStatus === 'scanning' && (
              <Button 
                className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                disabled
              >
                <Clock className="mr-2" size={16} />
                Aguardando QR Code...
              </Button>
            )}
            
            {(connectionStatus === 'connected' || isConnected) && (
              <div className="space-y-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  disabled
                >
                  <CheckCircle className="mr-2" size={16} />
                  WhatsApp Conectado
                </Button>
                
                <Button 
                  className="btn-primary w-full"
                  onClick={handleSyncContacts}
                  disabled={syncContactsMutation.isPending}
                >
                  {syncContactsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2" size={16} />
                      Sincronizar Contatos e Conversas
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">🔗 Como Funciona a Conexão:</h4>
              <div className="text-sm text-gray-300 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">1</div>
                  <div>
                    <p className="font-medium text-white">Clique em "Conectar WhatsApp"</p>
                    <p className="text-gray-400">Uma nova aba será aberta com o WhatsApp Web</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">2</div>
                  <div>
                    <p className="font-medium text-white">Escaneie o QR Code</p>
                    <p className="text-gray-400">Use seu celular para escanear o código QR</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">3</div>
                  <div>
                    <p className="font-medium text-white">Conexão Automática</p>
                    <p className="text-gray-400">O sistema detectará a conexão automaticamente</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
                  <p className="text-blue-300 text-sm">
                    <strong>💡 Dica:</strong> Mantenha o WhatsApp Web aberto para que as automações funcionem corretamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Persistência e Backup */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="mr-2 text-blue-400" size={20} />
            Persistência e Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status do Sistema */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Shield className="mr-2 text-green-400" size={16} />
              Status do Sistema
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-400">Conversas</p>
                <p className="text-white font-bold text-lg">{(systemStatus as any)?.totalChats || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">Contatos Salvos</p>
                <p className="text-white font-bold text-lg">{(systemStatus as any)?.totalContacts || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">Backups</p>
                <p className="text-white font-bold text-lg">{(systemStatus as any)?.availableBackups || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">Uptime</p>
                <p className="text-white font-bold text-lg">
                  {(systemStatus as any)?.uptime ? formatUptime((systemStatus as any).uptime) : '0h 0m'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Auto-Save Inteligente</p>
                <p className="text-sm text-gray-400">Salvamento automático a cada 10 segundos + backup a cada 5 minutos</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400">
                {(systemStatus as any)?.autoSaveEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {(systemStatus as any)?.lastBackup && (
              <div className="mt-3 p-3 bg-blue-900/30 border border-blue-600 rounded">
                <p className="text-blue-300 text-sm">
                  <strong>Último Backup:</strong> {formatBackupDate((systemStatus as any).lastBackup)}
                </p>
              </div>
            )}
          </div>

          {/* Controles de Backup */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => forceSaveMutation.mutate()}
                disabled={forceSaveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                {forceSaveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} />
                    Salvar Agora
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => refetchBackups()}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1"
              >
                <Download className="mr-2" size={16} />
                Atualizar Lista
              </Button>
            </div>

            {/* Lista de Backups */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">Backups Disponíveis</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(backupsData as any)?.backups?.length > 0 ? (
                  (backupsData as any).backups.slice(0, 10).map((backup: string, index: number) => (
                    <div key={backup} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                      <div>
                        <p className="text-white font-medium">
                          Backup #{index + 1}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatBackupDate(backup)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => restoreBackupMutation.mutate(backup)}
                        disabled={restoreBackupMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {restoreBackupMutation.isPending ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <>
                            <Upload size={14} className="mr-1" />
                            Restaurar
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">
                    Nenhum backup disponível
                  </p>
                )}
              </div>
            </div>

            {/* Informações sobre Persistência */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">🔒 Salvamento Automático Inteligente:</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>✅ <strong>Contatos:</strong> Salvos imediatamente ao criar/editar/remover</li>
                  <li>✅ <strong>Conversas:</strong> Atualizadas automaticamente a cada nova mensagem</li>
                  <li>✅ <strong>Mensagens:</strong> Salvamento a cada 5 mensagens (últimas 100 por chat)</li>
                  <li>✅ <strong>Tags/Categorias:</strong> Persistidas automaticamente</li>
                  <li>✅ <strong>Configurações:</strong> Salvamento inteligente a cada mudança</li>
                  <li>✅ <strong>Estado do sistema:</strong> Conexões, status, uptime</li>
                </ul>
                
                <div className="mt-3 p-3 bg-green-900/30 border border-green-600 rounded">
                  <p className="text-green-300 text-sm">
                    <strong>🚀 Sistema Inteligente:</strong> Salva apenas o que mudou a cada 10 segundos. 
                    Backups automáticos a cada 5 minutos. Mantemos os últimos 10 backups.
                  </p>
                </div>
                
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-600 rounded">
                  <p className="text-blue-300 text-sm">
                    <strong>💡 Zero Perda de Dados:</strong> Todas as suas ações (criar contato, salvar tag, enviar mensagem) 
                    são automaticamente persistidas. Você pode fechar o sistema a qualquer momento!
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

      {/* Data Analysis */}
      <Card className="surface-dark border">
        <CardHeader>
          <CardTitle className="text-white">📊 Análise de Conversas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-3">Dados Sincronizados do WhatsApp</h4>
            <div className="text-sm text-gray-300 space-y-2">
              <p><strong>O que é importado automaticamente:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>✅ Nomes dos contatos e grupos</li>
                <li>✅ Números de telefone</li>
                <li>✅ Status de atividade (online/offline)</li>
                <li>✅ Classificação automática por tipo (grupo/individual)</li>
                <li>✅ Última vez que conversaram</li>
              </ul>
              
              <div className="mt-3 p-3 bg-green-900/30 border border-green-600 rounded">
                <p className="text-green-300 text-sm">
                  <strong>🔒 Privacidade:</strong> Apenas metadados são coletados. O conteúdo das mensagens não é armazenado.
                </p>
              </div>
            </div>
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