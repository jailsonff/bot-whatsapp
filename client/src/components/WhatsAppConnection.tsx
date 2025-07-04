import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  RefreshCw,
  AlertCircle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/hooks/useWebSocket";

interface WhatsAppStatus {
  id: number;
  isConnected: boolean;
  lastConnected: string | null;
  autoReconnect: boolean;
}

export function WhatsAppConnection() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Buscar status e QR Code
  const fetchStatus = async () => {
    try {
      const statusResponse = await apiRequest("GET", "/api/whatsapp/status");
      const statusData = await statusResponse.json();
      setStatus(statusData);

      if (!statusData.isConnected) {
        const qrResponse = await apiRequest("GET", "/api/whatsapp/qr");
        const qrData = await qrResponse.json();
        setQrCode(qrData.qrCode);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    }
  };

  // Buscar status na inicialização
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Atualizar a cada 10 segundos (reduzido)
    return () => clearInterval(interval);
  }, []);

  // Reiniciar conexão
  const handleRestart = async () => {
    setLoading(true);
    try {
      console.log('🔄 Restarting WhatsApp connection...');
      await apiRequest("POST", "/api/whatsapp/restart", {});
      
      // Wait a bit and force fetch new status
      setTimeout(() => {
        fetchStatus();
        setLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error restarting connection:', error);
      setLoading(false);
    }
  };

  // Forçar inicialização (para quando QR não aparece)
  const handleForceInit = async () => {
    setLoading(true);
    try {
      console.log('🚀 Force initializing WhatsApp...');
      
      // Use the force-init endpoint
      await apiRequest("POST", "/api/whatsapp/force-init", {});
      
      // Wait and fetch status
      setTimeout(async () => {
        await fetchStatus();
        
        // If still no QR after restart, try fetching QR directly
        if (!qrCode) {
          console.log('📱 No QR code found after force init, fetching directly...');
          try {
            const qrResponse = await apiRequest("GET", "/api/whatsapp/qr");
            const qrData = await qrResponse.json();
            setQrCode(qrData.qrCode);
          } catch (qrError) {
            console.error('Error fetching QR:', qrError);
          }
        }
        
        setLoading(false);
      }, 5000);
    } catch (error) {
      console.error('Error force initializing:', error);
      setLoading(false);
    }
  };

  // Limpar dados corrompidos
  const handleClearData = async () => {
    setLoading(true);
    try {
      console.log('🧹 Clearing corrupted data...');
      
      await apiRequest("POST", "/api/whatsapp/clear-data", {});
      
      // Force refresh of conversations
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing data:', error);
      setLoading(false);
    }
  };

  // Sanitizar chats (remover Invalid Date)
  const handleSanitizeChats = async () => {
    setLoading(true);
    try {
      console.log('🧹 Sanitizing chats...');
      
      const response = await apiRequest("POST", "/api/whatsapp/sanitize-chats", {});
      const result = await response.json();
      
      console.log(`✅ Sanitization result:`, result);
      
      // Force refresh of conversations
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error sanitizing chats:', error);
      setLoading(false);
    }
  };

  // WebSocket events
  useWebSocketEvent('whatsapp_qr', (data: any) => {
    console.log('📱 Novo QR Code recebido via WebSocket:', data);
    setQrCode(data.qrCode);
    setStatus(prev => prev ? { ...prev, isConnected: false } : null);
  });

  useWebSocketEvent('whatsapp_connected', (data: any) => {
    console.log('🟢 WhatsApp conectado via WebSocket:', data);
    setStatus(prev => prev ? { ...prev, isConnected: true, lastConnected: new Date().toISOString() } : null);
    setQrCode(null);
  });

  useWebSocketEvent('whatsapp_disconnected', (data: any) => {
    console.log('🔴 WhatsApp desconectado via WebSocket:', data);
    setStatus(prev => prev ? { ...prev, isConnected: false } : null);
    // Aguardar um pouco antes de buscar novo QR Code
    setTimeout(() => {
      fetchStatus();
    }, 2000);
  });

  // Ocultar completamente quando conectado (será mostrado na sidebar)
  if (status?.isConnected) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>WhatsApp Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          {status?.isConnected ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}
        </div>

        {/* QR Code ou mensagem quando não há QR */}
        {!status?.isConnected && !qrCode && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>QR Code não disponível</span>
            </div>
            <p className="text-xs text-gray-500">
              Clique em "Gerar QR Code" para conectar
            </p>
          </div>
        )}

        {/* QR Code */}
        {!status?.isConnected && qrCode && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <QrCode className="h-4 w-4" />
              <span>Escaneie com seu WhatsApp</span>
            </div>
            <div className="bg-white p-4 rounded-lg inline-block">
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500">
              Abra o WhatsApp → Mais opções → Dispositivos conectados → Conectar dispositivo
            </p>
          </div>
        )}

        {/* Conectado */}
        {status?.isConnected && (
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <p className="text-sm text-green-600 font-medium">
              WhatsApp conectado com sucesso!
            </p>
            <p className="text-xs text-gray-500">
              Agora você pode enviar e receber mensagens
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button 
              onClick={fetchStatus} 
              variant="outline" 
              size="sm"
              className="flex-1"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            
            {!status?.isConnected && !qrCode && (
              <Button 
                onClick={handleForceInit} 
                variant="default" 
                size="sm"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Gerando..." : "Gerar QR Code"}
              </Button>
            )}
            
            {!status?.isConnected && qrCode && (
              <Button 
                onClick={handleRestart} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Reiniciando..." : "Novo QR"}
              </Button>
            )}
            
            {status?.isConnected && (
              <Button 
                onClick={handleRestart} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Desconectando..." : "Desconectar"}
              </Button>
            )}
          </div>
          
          {/* Ações de manutenção sempre disponíveis */}
          <div className="flex space-x-2">
            <Button 
              onClick={handleSanitizeChats} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              {loading ? "Sanitizando..." : "Sanitizar Chats"}
            </Button>
            
            <Button 
              onClick={handleClearData} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              {loading ? "Limpando..." : "Limpar Tudo"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 