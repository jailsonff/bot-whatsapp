import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Play, Pause, Trash2, Clock, Send, Plus, RefreshCw, Radio, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getUniqueCategories, DEFAULT_CATEGORIES } from "@/lib/categories";

const statusColors = {
  draft: "bg-gray-500/20 text-gray-400",
  active: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400"
};

const statusLabels = {
  draft: "Rascunho",
  active: "Em andamento",
  completed: "Concluído",
  paused: "Pausado"
};

// Schema para o formulário
const broadcastFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  interval: z.coerce.number().min(1).max(300).default(5),
  scheduledFor: z.string().optional(),
  status: z.string().default("draft")
});

type BroadcastFormData = z.infer<typeof broadcastFormSchema>;

interface SavedContact {
  id: string;
  name: string;
  notes?: string;
  gender?: string;
  lastInteraction?: string;
}

export default function Broadcasts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar contatos salvos
  const { data: savedContacts = [], isLoading: isLoadingSavedContacts, refetch: refetchSavedContacts } = useQuery({
    queryKey: ["/api/saved-contacts"],
    refetchInterval: 10000,
  }) as { data: SavedContact[]; isLoading: boolean; refetch: Function };

  // Buscar broadcasts
  const { data: broadcasts = [], refetch: refetchBroadcasts } = useQuery({
    queryKey: ["/api/broadcasts"],
    refetchInterval: 5000,
  });

  const form = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastFormSchema),
    defaultValues: {
      name: "",
      message: "",
      interval: 5,
      status: "draft"
    }
  });

  const createBroadcastMutation = useMutation({
    mutationFn: async (data: BroadcastFormData) => {
      const response = await apiRequest("POST", "/api/broadcasts", {
        ...data,
        targetTags: selectedTags,
        total: savedContacts.filter(contact => 
          selectedTags.some(tag => {
            const contactCategory = contact.notes?.trim().toLowerCase() || "";
            return contactCategory === tag.toLowerCase();
          })
        ).length
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      form.reset();
      setSelectedTags([]);
      toast({
        title: "Sucesso!",
        description: "Nova campanha de disparo criada com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar campanha de disparo",
        variant: "destructive"
      });
    }
  });

  const executeBroadcastMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/broadcasts/${id}/execute`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      toast({
        title: "Sucesso!",
        description: "Campanha iniciada com sucesso!"
      });
    }
  });

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/broadcasts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      toast({
        title: "Sucesso!",
        description: "Campanha removida com sucesso!"
      });
    }
  });

  const onSubmit = (data: BroadcastFormData) => {
    if (selectedTags.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma categoria de contatos",
        variant: "destructive"
      });
      return;
    }
    createBroadcastMutation.mutate(data);
  };

  const handleExecuteBroadcast = (id: number) => {
    executeBroadcastMutation.mutate(id);
  };

  const handleDeleteBroadcast = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta campanha?")) {
      deleteBroadcastMutation.mutate(id);
    }
  };

  const filteredContacts = savedContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueCategories = getUniqueCategories(
    savedContacts.map(contact => contact.notes).filter(Boolean) as string[]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h3 className="text-lg font-semibold text-white">Disparos em Massa</h3>
        <p className="text-gray-400">Envie mensagens para múltiplos contatos</p>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Form Card */}
        <Card className="lg:col-span-2 bg-gray-800 border-gray-700 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-white">Nova Campanha</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome da Campanha</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: Promoção Black Friday"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Seleção de Contatos */}
                <div>
                  <Label className="text-white">
                    Selecionar Contatos ({selectedTags.length} selecionados)
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <Input
                        placeholder="Buscar categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto p-2 bg-gray-700 rounded-lg border border-gray-600">
                      {uniqueCategories.map((category) => (
                        <label
                          key={category}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-600 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTags.includes(category)}
                            onCheckedChange={() => {
                              setSelectedTags(prev => 
                                prev.includes(category)
                                  ? prev.filter(t => t !== category)
                                  : [...prev, category]
                              );
                            }}
                          />
                          <span className="text-white text-sm truncate">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mensagem */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Mensagem</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white h-24"
                          placeholder="Digite sua mensagem aqui..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Configurações */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="interval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Intervalo (segundos)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            min="1"
                            max="300"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledFor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Agendar para</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Botão de Envio */}
                <Button 
                  type="submit" 
                  disabled={createBroadcastMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {createBroadcastMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Criar Campanha
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Lista de Campanhas */}
        <Card className="bg-gray-800 border-gray-700 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-white">Campanhas</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-3">
              {broadcasts.map((broadcast: any) => (
                <div key={broadcast.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium truncate">{broadcast.name}</h4>
                    <Badge className={statusColors[broadcast.status as keyof typeof statusColors]}>
                      {statusLabels[broadcast.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                    {broadcast.message}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{broadcast.sent || 0}/{broadcast.total || 0} enviados</span>
                    <span>{broadcast.interval}s intervalo</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {broadcast.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleExecuteBroadcast(broadcast.id)}
                        disabled={executeBroadcastMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteBroadcast(broadcast.id)}
                      disabled={deleteBroadcastMutation.isPending}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {broadcasts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Radio className="mx-auto h-8 w-8 mb-2" />
                  <p>Nenhuma campanha criada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 