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
import { Plus, GitBranch, Edit, Trash2, Copy, Play, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConversationFlowSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const flowIcons = {
  commercial: "text-purple-400",
  support: "text-orange-400",
  general: "text-blue-400"
};

export default function Flows() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["/api/flows"]
  });

  const createFlowMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/flows", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
      setIsDialogOpen(false);
      toast({
        title: "Fluxo criado",
        description: "Novo fluxo de conversa criado com sucesso!"
      });
    }
  });

  const toggleFlowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/flows/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
      toast({
        title: "Fluxo atualizado",
        description: "Status do fluxo alterado com sucesso!"
      });
    }
  });

  const deleteFlowMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/flows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
      toast({
        title: "Fluxo removido",
        description: "Fluxo deletado com sucesso!"
      });
    }
  });

  const form = useForm({
    resolver: zodResolver(insertConversationFlowSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerKeywords: [],
      responses: [],
      isActive: true
    }
  });

  const onSubmit = (data: any) => {
    // Convert keywords and responses strings to arrays
    const triggerKeywords = data.triggerKeywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    const responses = data.responses.split('\n').map((r: string) => r.trim()).filter(Boolean);
    createFlowMutation.mutate({ ...data, triggerKeywords, responses });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Fluxos de Conversa</h3>
          <p className="text-gray-400">Configure fluxos automatizados de resposta</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus size={16} className="mr-2" />
              Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Novo Fluxo</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nome do Fluxo</FormLabel>
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
                  name="triggerKeywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Palavras-chave Gatilho (separadas por vírgula)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="preço, orçamento, comprar"
                          className="bg-gray-700 border-gray-600 text-white" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Respostas (uma por linha)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white h-32"
                          placeholder="Olá! Vou te ajudar com informações sobre nossos produtos...&#10;Você gostaria de saber mais sobre algum produto específico?"
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
                  <Button type="submit" className="btn-primary" disabled={createFlowMutation.isPending}>
                    {createFlowMutation.isPending ? "Criando..." : "Criar Fluxo"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Flow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {flows.map((flow: any) => (
          <Card key={flow.id} className="surface-dark border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <GitBranch className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{flow.name}</h4>
                    <p className="text-sm text-gray-400">{flow.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${flow.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm ${flow.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {flow.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Play className="text-primary" size={14} />
                    <span className="text-xs font-medium text-gray-400 uppercase">Gatilho</span>
                  </div>
                  <p className="text-sm text-white">
                    Palavras: {flow.triggerKeywords.join(', ')}
                  </p>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="text-blue-400" size={14} />
                    <span className="text-xs font-medium text-gray-400 uppercase">Resposta</span>
                  </div>
                  <p className="text-sm text-white">
                    {flow.responses[0] || "Sem resposta definida"}
                  </p>
                  {flow.responses.length > 1 && (
                    <p className="text-xs text-gray-400 mt-1">
                      +{flow.responses.length - 1} resposta(s) adicional(is)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                    <Edit size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                    <Copy size={16} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteFlowMutation.mutate(flow.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-400">{flow.executions} execuções</span>
                  <Switch
                    checked={flow.isActive}
                    onCheckedChange={(checked) => 
                      toggleFlowMutation.mutate({ id: flow.id, isActive: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {flows.length === 0 && (
        <Card className="surface-dark border">
          <CardContent className="p-12 text-center">
            <GitBranch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum fluxo criado</h3>
            <p className="text-gray-400 mb-4">Comece criando seu primeiro fluxo de conversa automatizado.</p>
            <Button className="btn-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Criar Primeiro Fluxo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
