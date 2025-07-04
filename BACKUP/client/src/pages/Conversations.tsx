import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  Search, 
  Users, 
  UserPlus,
  Check,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketEvent } from "@/hooks/useWebSocket";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  fromMe: boolean;
  isGroup: boolean;
  participant?: string;
  chatName?: string;
}

interface SavedContact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  gender?: string;
}

export default function Conversations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"conversations" | "contacts">("conversations");
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSaveContactModalOpen, setIsSaveContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactTag, setContactTag] = useState("");
  const [contactGender, setContactGender] = useState("");

  // Buscar conversas do backend
  const { data: conversations = [], isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  }) as { data: Conversation[]; isLoading: boolean; refetch: Function };

  // Buscar contatos salvos
  const { data: savedContacts = [], isLoading: isLoadingSavedContacts } = useQuery({
    queryKey: ["/api/saved-contacts"],
    refetchInterval: 10000,
  }) as { data: SavedContact[]; isLoading: boolean };

  // Buscar mensagens da conversa selecionada
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      console.log(`Fetching messages for chat: ${selectedConversation}`);
      const response = await apiRequest("GET", `/api/conversations/${encodeURIComponent(selectedConversation)}/messages`);
      const data = await response.json();
      console.log(`Received ${data.length} messages for chat: ${selectedConversation}`);
      return data;
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000,
  }) as { data: Message[]; refetch: Function };

  // Verificar se o contato atual está salvo
  const { data: isCurrentContactSaved } = useQuery({
    queryKey: ["/api/saved-contacts", selectedConversation, "is-saved"],
    queryFn: async () => {
      if (!selectedConversation) return { isSaved: false };
      const response = await apiRequest("GET", `/api/saved-contacts/${encodeURIComponent(selectedConversation)}/is-saved`);
      return response.json();
    },
    enabled: !!selectedConversation,
  }) as { data: { isSaved: boolean } | undefined };

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/conversations/send", data);
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      // Refetch conversations para atualizar a ordenação (nova mensagem = mover para topo)
      refetchConversations();
      toast({
        title: "Mensagem enviada",
        description: "Mensagem enviada com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    }
  });

  // Mutation para salvar contato
  const saveContactMutation = useMutation({
    mutationFn: async (data: { chatId: string; name?: string; notes?: string; gender?: string }) => {
      const response = await apiRequest("POST", "/api/saved-contacts", data);
      return response.json();
    },
    onSuccess: (savedContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts", selectedConversation, "is-saved"] });
      toast({
        title: "Contato salvo",
        description: `${savedContact.name} foi adicionado aos seus contatos!`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar contato",
        description: error.message || "Não foi possível salvar o contato",
        variant: "destructive"
      });
    }
  });

  // Mutation para iniciar chat com contato salvo
  const startChatMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiRequest("POST", `/api/saved-contacts/${contactId}/start-chat`, {});
      return response.json();
    },
    onSuccess: () => {
      // Aguardar um pouco e refetch para garantir que a nova conversa apareça no topo
      setTimeout(() => {
        refetchConversations();
      }, 1000);
      toast({
        title: "Chat iniciado",
        description: "Chat iniciado com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar chat",
        description: error.message || "Não foi possível iniciar o chat",
        variant: "destructive"
      });
    }
  });

  // WebSocket events para atualizações em tempo real
  useWebSocketEvent('whatsapp_message', (message: any) => {
    console.log('Nova mensagem recebida:', message);
    refetchConversations();
    if (selectedConversation && (message.from === selectedConversation || message.to === selectedConversation)) {
      refetchMessages();
    }
    toast({
      title: "Nova mensagem",
      description: `Mensagem de ${message.chatName || message.from}`,
    });
  });

  useWebSocketEvent('message_sent', (message: any) => {
    console.log('Mensagem enviada via WebSocket:', message);
    refetchConversations();
    if (selectedConversation && message.to === selectedConversation) {
      refetchMessages();
    }
    toast({
      title: "Mensagem enviada",
      description: `Mensagem enviada com sucesso`,
    });
  });

  // Scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      message: messageText
    });
  };

  const handleSaveContact = () => {
    if (!selectedConversation) return;
    const currentConv = conversations.find((c: Conversation) => c.id === selectedConversation);
    if (!currentConv) return;
    setContactName(currentConv.name || "");
    setContactTag("");
    setContactGender("");
    setIsSaveContactModalOpen(true);
  };

  const handleSubmitSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation) return;
    
    saveContactMutation.mutate({
      chatId: selectedConversation as string,
      name: contactName,
      notes: contactTag,
      gender: contactGender
    });
    setIsSaveContactModalOpen(false);
  };

  const handleStartChatWithContact = (contactId: string) => {
    startChatMutation.mutate(contactId);
    setSelectedConversation(contactId);
  };

  // Encontrar contato salvo correspondente
  const findSavedContact = (chatId: string) => {
    return savedContacts.find((contact: SavedContact) => contact.id === chatId);
  };

  // Obter nome de exibição
  const getDisplayName = (conversation: Conversation) => {
    const savedContact = findSavedContact(conversation.id);
    return savedContact ? savedContact.name : conversation.name;
  };

  // Filtrar e ordenar conversas por busca e data (mais recentes primeiro)
  const filteredConversations = conversations
    .filter((conv: Conversation) => {
      const displayName = getDisplayName(conv);
      return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             conv.phone.includes(searchTerm) ||
             conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a: Conversation, b: Conversation) => {
      // Priorizar conversas com mensagens não lidas
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      
      // Ordenar por timestamp da última mensagem (mais recente primeiro)
      try {
        // Converter lastMessageTime para timestamp comparável
        const getTimestamp = (timeStr: string) => {
          if (!timeStr || timeStr.includes('Invalid')) return 0;
          
          // Se o formato for HH:MM:SS ou HH:MM, assumir que é de hoje
          if (timeStr.includes(':') && !timeStr.includes('/') && !timeStr.includes('-')) {
            const today = new Date();
            const timeParts = timeStr.split(':').map(Number);
            return new Date(
              today.getFullYear(), 
              today.getMonth(), 
              today.getDate(), 
              timeParts[0] || 0, 
              timeParts[1] || 0, 
              timeParts[2] || 0
            ).getTime();
          }
          
          // Tentar converter diretamente para timestamp
          const date = new Date(timeStr);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        const timestampA = getTimestamp(a.lastMessageTime);
        const timestampB = getTimestamp(b.lastMessageTime);
        
        // Ordenar do mais recente para o mais antigo
        return timestampB - timestampA;
      } catch (error) {
        console.error('Erro ao ordenar conversas:', error);
        return 0;
      }
    });

  const filteredContacts = savedContacts.filter((contact: SavedContact) => {
    return contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact.phone.includes(searchTerm) ||
           (contact.notes && contact.notes.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const selectedConv = conversations.find((c: Conversation) => c.id === selectedConversation);

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
            <span className="font-medium">WhatsApp Manager - Conversas</span>
          </div>
          <span className="text-sm opacity-90">
            {conversations.length} conversas, {savedContacts.length} contatos salvos
          </span>
        </div>
      </div>

      {/* WhatsApp Connection Status */}
      <WhatsAppConnection />

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-700 bg-gray-800 flex-col`}>
          {/* Header da Sidebar */}
          <div className="p-4 border-b border-gray-700">
            {/* Abas */}
            <div className="flex space-x-1 mb-3">
              <Button
                variant={activeTab === "conversations" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("conversations")}
                className="flex-1"
              >
                <MessageCircle size={16} className="mr-2" />
                Conversas
              </Button>
              <Button
                variant={activeTab === "contacts" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("contacts")}
                className="flex-1"
              >
                <UserPlus size={16} className="mr-2" />
                Contatos ({savedContacts.length})
              </Button>
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={activeTab === "conversations" ? "Buscar conversas..." : "Buscar contatos..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "conversations" ? (
              /* Lista de Conversas */
              <>
                {filteredConversations.map((conversation) => {
                  const savedContact = findSavedContact(conversation.id);
                  const displayName = getDisplayName(conversation);
                  
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                        selectedConversation === conversation.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className={`text-white ${savedContact ? 'bg-blue-600' : 'bg-primary'}`}>
                              {conversation.isGroup ? (
                                <Users size={16} />
                              ) : (
                                displayName.charAt(0).toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {savedContact && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white truncate">
                              {displayName}
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
                              <Badge className="bg-green-600 text-white">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          
                          {savedContact?.notes && (
                            <div className="mt-1">
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                {savedContact.notes}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <MessageCircle size={40} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                )}
              </>
            ) : (
              /* Lista de Contatos Salvos */
              <>
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleStartChatWithContact(contact.id)}
                    className="p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {contact.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {contact.name}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {contact.phone}
                        </p>
                        {contact.notes && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1">
                            {contact.notes}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredContacts.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <UserPlus size={40} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhum contato encontrado</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Área de Chat */}
        {selectedConv ? (
          <div className={`${!selectedConversation ? 'hidden' : 'flex'} flex-1 flex-col bg-gray-800 overflow-hidden`}>
            {/* Cabeçalho do Chat */}
            <div className="p-4 border-b border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-white">
                      {selectedConv.isGroup ? (
                        <Users size={16} />
                      ) : (
                        getDisplayName(selectedConv).charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="font-medium text-white">
                      {getDisplayName(selectedConv)}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {selectedConv.isOnline ? 'Online' : 'Offline'} • {selectedConv.phone}
                    </p>
                  </div>
                </div>
                
                {!selectedConv.isGroup && !isCurrentContactSaved?.isSaved && (
                  <Button
                    onClick={handleSaveContact}
                    disabled={saveContactMutation.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Salvar Contato
                  </Button>
                )}
              </div>
            </div>
            
            {/* Área de Mensagens */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message: Message, index: number) => (
                    <div
                      key={message.id || index}
                      className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.fromMe
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {message.isGroup && !message.fromMe && (
                          <div className="text-xs text-gray-300 mb-1">
                            {message.participant || 'Participante'}
                          </div>
                        )}
                        <p className="text-sm">{message.body}</p>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Campo de Envio */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Selecione uma conversa</h3>
              <p className="text-sm">Escolha uma conversa à esquerda para começar a conversar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Salvar Contato */}
      <Dialog open={isSaveContactModalOpen} onOpenChange={setIsSaveContactModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Salvar Contato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSaveContact} className="space-y-4">
            <div>
              <Label htmlFor="contactName" className="text-white">Nome do Contato</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="contactTag" className="text-white">Categoria/Tag</Label>
              <Select value={contactTag} onValueChange={setContactTag}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="Amigo">Amigo</SelectItem>
                  <SelectItem value="Família">Família</SelectItem>
                  <SelectItem value="Trabalho">Trabalho</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactGender" className="text-white">Gênero (Opcional)</Label>
              <Select value={contactGender} onValueChange={setContactGender}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Não informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!contactName.trim() || !contactTag}>
                <UserPlus className="h-4 w-4 mr-2" />
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 