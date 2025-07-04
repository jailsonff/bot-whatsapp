import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
}

interface SavedContact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  gender?: string;
}

export default function ConversationsSimple() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Buscar conversas do backend
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  }) as { data: Conversation[]; isLoading: boolean };

  // Buscar contatos salvos
  const { data: savedContacts = [], isLoading: isLoadingSavedContacts } = useQuery({
    queryKey: ["/api/saved-contacts"],
    refetchInterval: 10000,
  }) as { data: SavedContact[]; isLoading: boolean };

  if (isLoadingConversations || isLoadingSavedContacts) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="font-medium">Conversas - Modo Simplificado</span>
          </div>
          <span className="text-sm opacity-90">
            Total: {conversations.length} conversas, {savedContacts.length} contatos salvos
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-700 bg-gray-800">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-white font-medium">Lista de Conversas</h2>
          </div>
          
          <div className="overflow-y-auto">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                  selectedConversation === conversation.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    {conversation.isGroup ? (
                      <Users size={16} className="text-white" />
                    ) : (
                      <span className="text-white font-medium">
                        {conversation.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {conversation.lastMessageTime}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-400 truncate">
                      {conversation.lastMessage}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {conversation.phone}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {conversations.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-4 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          {selectedConversation ? (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Conversa Selecionada: {selectedConversation}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300">
                <p>Conversa selecionada com sucesso!</p>
                <p className="mt-2 text-sm">
                  Esta é uma versão simplificada para testar se o componente funciona.
                </p>
                <Button 
                  onClick={() => setSelectedConversation(null)}
                  className="mt-4"
                  variant="outline"
                >
                  Voltar à lista
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-gray-400">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Selecione uma conversa</h3>
              <p className="text-sm">Escolha uma conversa à esquerda para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 