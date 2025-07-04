import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Download, Edit, Trash2, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getUniqueCategories } from "@/lib/categories";

const tagColors = {
  cliente: "bg-blue-500/20 text-blue-400",
  amigo: "bg-green-500/20 text-green-400",
  familia: "bg-purple-500/20 text-purple-400",
  nao_agendado: "bg-orange-500/20 text-orange-400"
};

const tagLabels = {
  cliente: "Cliente",
  amigo: "Amigo",
  familia: "Família",
  nao_agendado: "Não Agendado"
};

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", notes: "" });
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({ name: "", phone: "", notes: "" });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/saved-contacts"]
  });

  // Obter categorias únicas usando o arquivo centralizado
  const customCategories = Array.isArray(contacts) ? contacts.map((contact: any) => contact?.notes?.trim()).filter(Boolean) : [];
  const availableCategories = getUniqueCategories(customCategories);

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/saved-contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts"] });
      setIsNewContactModalOpen(false);
      setNewContactForm({ name: "", phone: "", notes: "" });
      toast({
        title: "Contato criado",
        description: "Novo contato adicionado com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar contato",
        description: error.message || "Não foi possível criar o contato",
        variant: "destructive"
      });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts"] });
      toast({
        title: "Contato removido",
        description: "Contato deletado com sucesso!"
      });
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; notes: string }) => {
      const response = await apiRequest("PUT", `/api/saved-contacts/${data.id}`, {
        name: data.name,
        notes: data.notes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-contacts"] });
      setEditingContact(null);
      toast({
        title: "Contato atualizado",
        description: "Contato editado com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message || "Não foi possível atualizar o contato",
        variant: "destructive"
      });
    }
  });

  const form = useForm({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      tag: "cliente",
      isActive: true
    }
  });

  const onSubmit = (data: any) => {
    createContactMutation.mutate(data);
  };

  const handleExport = async (format: 'csv' | 'txt') => {
    try {
      const response = await fetch(`/api/contacts/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportação concluída",
        description: `Contatos exportados em formato ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os contatos",
        variant: "destructive"
      });
    }
  };

  const filteredContacts = (contacts as any[]).filter((contact: any) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm);
    
    if (selectedTag === "all") return matchesSearch;
    
    // Filtrar por categoria baseado nas notes (comparação exata)
    const contactTag = contact.notes?.toLowerCase() || "";
    return matchesSearch && contactTag === selectedTag.toLowerCase();
  });

  const handleSelectContact = (id: number) => {
    setSelectedContacts(prev => 
      prev.includes(id) 
        ? prev.filter(contactId => contactId !== id)
        : [...prev, id]
    );
  };

  const handleStartConversation = async (contact: any) => {
    try {
      // Primeiro, chamar a API para iniciar o chat com o contato
      const response = await apiRequest("POST", `/api/saved-contacts/${contact.id}/start-chat`, {});
      
      if (response.ok) {
        // Redirecionar para a página de conversas com o chat específico
        setLocation(`/conversations?chat=${encodeURIComponent(contact.id)}`);
        
        toast({
          title: "Chat iniciado",
          description: `Conversa iniciada com ${contact.name}`
        });
      } else {
        throw new Error("Falha ao iniciar conversa");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Erro ao iniciar conversa",
        description: "Não foi possível iniciar a conversa com este contato",
        variant: "destructive"
      });
    }
  };

  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name,
      notes: contact.notes || ""
    });
  };

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    
    updateContactMutation.mutate({
      id: editingContact.id,
      name: editForm.name,
      notes: editForm.notes
    });
  };

  const handleCreateNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactForm.name.trim() || !newContactForm.phone.trim()) return;
    
    // Criar ID do chat baseado no telefone
    let chatId = newContactForm.phone.replace(/\D/g, ''); // Remove caracteres não numéricos
    
    console.log('📱 Telefone original:', newContactForm.phone);
    console.log('📱 Telefone limpo:', chatId);
    
    // Validar se o telefone tem pelo menos 10 dígitos
    if (chatId.length < 10) {
      toast({
        title: "Erro no telefone",
        description: "O número deve ter pelo menos 10 dígitos",
        variant: "destructive"
      });
      return;
    }
    
    // Se não começa com código do país, adicionar 55 (Brasil)
    if (!chatId.startsWith('55')) {
      chatId = '55' + chatId;
    }
    
    // Para números brasileiros, garantir que tem 13 dígitos (55 + 11 dígitos)
    // Se tem 12 dígitos (55 + 10), adicionar o 9 no celular
    if (chatId.startsWith('55') && chatId.length === 12) {
      // Inserir o 9 após o código do país e DDD
      const countryCode = chatId.substring(0, 2); // 55
      const areaCode = chatId.substring(2, 4); // DD
      const number = chatId.substring(4); // XXXXXXXX
      chatId = countryCode + areaCode + '9' + number; // 55DD9XXXXXXXX
    }
    
    // Adicionar sufixo do WhatsApp
    chatId = chatId + '@s.whatsapp.net';
    
    console.log('📱 ChatId final:', chatId);
    console.log('📝 Dados enviados:', {
      chatId: chatId,
      name: newContactForm.name,
      notes: newContactForm.notes
    });
    
    createContactMutation.mutate({
      chatId: chatId,
      name: newContactForm.name,
      notes: newContactForm.notes
    });
  };

  const handleOpenNewContactModal = () => {
    setNewContactForm({ name: "", phone: "", notes: "" });
    setIsNewContactModalOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((contact: any) => contact.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pl-10"
            />
          </div>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Filtrar por tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => handleExport('csv')}
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExport('txt')}
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <Download size={16} className="mr-2" />
            Exportar TXT
          </Button>
          <Button 
            onClick={handleOpenNewContactModal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            Novo Contato
          </Button>
          <Button 
            onClick={() => setLocation('/conversations')}
            className="btn-primary"
          >
            <MessageCircle size={16} className="mr-2" />
            Ir para Conversas
          </Button>
        </div>
      </div>

      {/* Contacts Table */}
      <Card className="surface-dark border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-700">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-gray-400">Nome</TableHead>
                <TableHead className="text-gray-400">Telefone</TableHead>
                <TableHead className="text-gray-400">Tag</TableHead>
                <TableHead className="text-gray-400">Última Conversa</TableHead>
                <TableHead className="text-gray-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact: any) => (
                <TableRow key={contact.id} className="border-gray-700 hover:bg-gray-700">
                  <TableCell>
                    <Checkbox 
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleSelectContact(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {contact.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{contact.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{contact.phone}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-500/20 text-blue-400">
                      {contact.notes || "Sem categoria"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {contact.lastInteraction 
                      ? new Date(contact.lastInteraction).toLocaleDateString() 
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-green-400 hover:text-green-300"
                        onClick={() => handleStartConversation(contact)}
                        title="Iniciar Conversa"
                      >
                        <MessageCircle size={16} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => handleEditContact(contact)}
                        title="Editar Contato"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Mostrando {filteredContacts.length} de {(contacts as any[]).length} contatos
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-700">
            Anterior
          </Button>
          <Button size="sm" className="bg-primary text-white">
            1
          </Button>
          <Button variant="outline" size="sm" className="border-gray-600 text-gray-400 hover:bg-gray-700">
            Próximo
          </Button>
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
          <form onSubmit={handleUpdateContact} className="space-y-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-500" />
                Editar Contato
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Campo Número (Não editável) */}
              <div className="space-y-2">
                <Label htmlFor="editPhone" className="text-sm font-medium text-gray-300">
                  Número do WhatsApp
                </Label>
                <Input 
                  id="editPhone"
                  value={editingContact?.phone || ""} 
                  disabled 
                  className="bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Campo Nome */}
              <div className="space-y-2">
                <Label htmlFor="editName" className="text-sm font-medium text-gray-300">
                  Nome do contato *
                </Label>
                <Input 
                  id="editName"
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  placeholder="Digite o nome do contato"
                  required 
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>

              {/* Campo Categoria */}
              <div className="space-y-2">
                <Label htmlFor="editNotes" className="text-sm font-medium text-gray-300">
                  Categoria
                </Label>
                <Select value={editForm.notes} onValueChange={value => setEditForm({...editForm, notes: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-blue-500">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category} className="text-white hover:bg-gray-700">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo Categoria Customizada */}
              <div className="space-y-2">
                <Label htmlFor="customCategory" className="text-sm font-medium text-gray-300">
                  Ou digite uma categoria personalizada
                </Label>
                <Input 
                  id="customCategory"
                  value={editForm.notes} 
                  onChange={e => setEditForm({...editForm, notes: e.target.value})} 
                  placeholder="Digite uma categoria personalizada"
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingContact(null)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                disabled={!editForm.name.trim() || updateContactMutation.isPending}
              >
                <Edit className="h-4 w-4" />
                {updateContactMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Contato */}
      <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
          <form onSubmit={handleCreateNewContact} className="space-y-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Novo Contato
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Campo Nome */}
              <div className="space-y-2">
                <Label htmlFor="newName" className="text-sm font-medium text-gray-300">
                  Nome do contato *
                </Label>
                <Input 
                  id="newName"
                  value={newContactForm.name} 
                  onChange={e => setNewContactForm({...newContactForm, name: e.target.value})} 
                  placeholder="Digite o nome do contato"
                  required 
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>

              {/* Campo Telefone */}
              <div className="space-y-2">
                <Label htmlFor="newPhone" className="text-sm font-medium text-gray-300">
                  Número do WhatsApp *
                </Label>
                <Input 
                  id="newPhone"
                  value={newContactForm.phone} 
                  onChange={e => setNewContactForm({...newContactForm, phone: e.target.value})} 
                  placeholder="Ex: (11) 99999-9999 ou 11999999999"
                  required 
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Digite apenas números ou use formato (DD) 9XXXX-XXXX
                </p>
              </div>

              {/* Campo Categoria */}
              <div className="space-y-2">
                <Label htmlFor="newNotes" className="text-sm font-medium text-gray-300">
                  Categoria
                </Label>
                <Select value={newContactForm.notes} onValueChange={value => setNewContactForm({...newContactForm, notes: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-blue-500">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category} className="text-white hover:bg-gray-700">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo Categoria Customizada */}
              <div className="space-y-2">
                <Label htmlFor="newCustomCategory" className="text-sm font-medium text-gray-300">
                  Ou digite uma categoria personalizada
                </Label>
                <Input 
                  id="newCustomCategory"
                  value={newContactForm.notes} 
                  onChange={e => setNewContactForm({...newContactForm, notes: e.target.value})} 
                  placeholder="Digite uma categoria personalizada"
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsNewContactModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                disabled={!newContactForm.name.trim() || !newContactForm.phone.trim() || createContactMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {createContactMutation.isPending ? "Criando..." : "Criar Contato"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
