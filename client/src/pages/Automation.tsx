import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Bot, Edit, Trash2, Clock, Key, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAutomationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Automation() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["/api/automations"]
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/automations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setIsDialogOpen(false);
      toast({
        title: "Automação criada",
        description: "Nova automação adicionada com sucesso!"
      });
    }
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/automations/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automação atualizada",
        description: "Status da automação alterado com sucesso!"
      });
    }
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automação removida",
        description: "Automação deletada com sucesso!"
      });
    }
  });

  const form = useForm({
    resolver: zodResolver(insertAutomationSchema),
    defaultValues: {
      name: "",
      description: "",
      keywords: [],
      response: "",
      delay: 2,
      isActive: true
    }
  });

  const onSubmit = (data: any) => {
    // Convert keywords string to array
    const keywords = data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    createAutomationMutation.mutate({ ...data, keywords });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Automações Ativas</h3>
          <p className="text-gray-400">Gerencie suas automações de resposta</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus size={16} className="mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Nova Automação</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome da Automação</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-gray-700 border-gray-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Descrição</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-gray-700 border-gray-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Palavras-chave (separadas por vírgula)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="olá, oi, bom dia"
                          className="bg-gray-700 border-gray-600 text-white" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Resposta Automática</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white h-24"
                          placeholder="Olá! Obrigado pelo contato. Como posso ajudar?"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="delay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Delay (segundos)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="1"
                          max="60"
                          className="bg-gray-700 border-gray-600 text-white" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-primary" disabled={createAutomationMutation.isPending}>
                    {createAutomationMutation.isPending ? "Criando..." : "Criar Automação"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automations.map((automation: any) => (
          <Card key={automation.id} className="surface-dark border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Bot className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{automation.name}</h4>
                    <p className="text-sm text-gray-400">{automation.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${automation.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm ${automation.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {automation.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm">
                  <Key className="text-gray-400 mr-2" size={16} />
                  <span className="text-gray-400">Palavras-chave:</span>
                  <span className="text-white ml-2 font-medium">
                    {automation.keywords.join(', ')}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="text-gray-400 mr-2" size={16} />
                  <span className="text-gray-400">Delay:</span>
                  <span className="text-white ml-2 font-medium">{automation.delay} segundos</span>
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="text-gray-400 mr-2" size={16} />
                  <span className="text-gray-400">Execuções:</span>
                  <span className="text-white ml-2 font-medium">{automation.executions}</span>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-300">{automation.response}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                    <Edit size={16} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteAutomationMutation.mutate(automation.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <Switch
                  checked={automation.isActive}
                  onCheckedChange={(checked) => 
                    toggleAutomationMutation.mutate({ id: automation.id, isActive: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {automations.length === 0 && (
        <Card className="surface-dark border">
          <CardContent className="p-12 text-center">
            <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhuma automação criada</h3>
            <p className="text-gray-400 mb-4">Comece criando sua primeira automação de resposta.</p>
            <Button className="btn-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
