// Categorias padrão para sistema de WhatsApp business
export const DEFAULT_CATEGORIES = [
  // Relacionamento pessoal
  "Amigo",
  "Família",
  "Conhecido",
  
  // Negócios e clientes
  "Cliente",
  "Cliente VIP",
  "Cliente Premium",
  "Ex-Cliente",
  "Prospect",
  "Lead",
  "Lead Qualificado",
  "Lead Frio",
  "Lead Quente",
  
  // Fornecedores e parceiros
  "Fornecedor",
  "Parceiro",
  "Colaborador",
  "Funcionário",
  "Ex-Funcionário",
  
  // Profissional
  "Trabalho",
  "Colega",
  "Chefe",
  "Subordinado",
  "Contato Profissional",
  
  // Vendas e marketing
  "Vendedor",
  "Comprador",
  "Interessado",
  "Não Interessado",
  "Bloqueado",
  
  // Status de agendamento
  "Agendado",
  "Não Agendado",
  "Reagendar",
  "Cancelado",
  
  // Segmentação de mercado
  "Empresa",
  "Pessoa Física",
  "Microempresa",
  "Pequena Empresa",
  "Média Empresa",
  "Grande Empresa",
  
  // Categorias específicas encontradas no sistema
  "Quero Engajar",
  "FXPLUSAGENCIA",
  "Seguidores",
  "Marketing Digital",
  "Influenciador",
  "Agência",
  "Desenvolvedor",
  "Designer",
  "Freelancer",
  "Consultor",
  "Coach",
  "Mentor",
  "Investidor",
  "Startup",
  "E-commerce",
  "Dropshipping",
  "Afiliado",
  "Produtor Digital",
  "Youtuber",
  "Tiktoker",
  "Instagramer",
  "Podcaster",
  "Streamer",
  "Gamer",
  "Artista",
  "Músico",
  "Fotógrafo",
  "Videomaker",
  "Editor",
  "Copywriter",
  "Redator",
  "Tradutor",
  "Professor",
  "Estudante",
  "Pesquisador",
  "Médico",
  "Advogado",
  "Contador",
  "Engenheiro",
  "Arquiteto",
  "Dentista",
  "Psicólogo",
  "Nutricionista",
  "Personal Trainer",
  "Cozinheiro",
  "Chef",
  "Garçom",
  "Vendedor Online",
  "Lojista",
  "Comerciante",
  "Representante",
  "Distribuidor",
  "Importador",
  "Exportador",
  
  // Outros
  "Spam",
  "Teste",
  "Temporário",
  "Inativo",
  "Ativo",
  "Novo",
  "Antigo",
  "VIP",
  "Premium",
  "Gratuito",
  "Pago"
];

// Função para obter categorias únicas combinando padrão + customizadas
export const getUniqueCategories = (customCategories: string[] = []): string[] => {
  const categories = new Set<string>();
  
  // Adicionar categorias padrão
  DEFAULT_CATEGORIES.forEach(cat => categories.add(cat));
  
  // Adicionar categorias customizadas
  customCategories.forEach(cat => {
    if (cat && cat.trim()) {
      categories.add(cat.trim());
    }
  });
  
  return Array.from(categories).sort();
};

// Cores para as categorias (opcional)
export const CATEGORY_COLORS = {
  // Relacionamento pessoal
  "Amigo": "bg-green-500/20 text-green-400",
  "Família": "bg-purple-500/20 text-purple-400",
  "Conhecido": "bg-gray-500/20 text-gray-400",
  
  // Negócios e clientes
  "Cliente": "bg-blue-500/20 text-blue-400",
  "Cliente VIP": "bg-yellow-500/20 text-yellow-400",
  "Cliente Premium": "bg-amber-500/20 text-amber-400",
  "Ex-Cliente": "bg-red-500/20 text-red-400",
  "Prospect": "bg-cyan-500/20 text-cyan-400",
  "Lead": "bg-indigo-500/20 text-indigo-400",
  "Lead Qualificado": "bg-emerald-500/20 text-emerald-400",
  "Lead Frio": "bg-blue-300/20 text-blue-300",
  "Lead Quente": "bg-orange-500/20 text-orange-400",
  
  // Categorias específicas
  "Quero Engajar": "bg-pink-500/20 text-pink-400",
  "FXPLUSAGENCIA": "bg-violet-500/20 text-violet-400",
  "Seguidores": "bg-rose-500/20 text-rose-400",
  "Marketing Digital": "bg-teal-500/20 text-teal-400",
  
  // Status de agendamento
  "Agendado": "bg-green-600/20 text-green-400",
  "Não Agendado": "bg-orange-500/20 text-orange-400",
  "Reagendar": "bg-yellow-600/20 text-yellow-400",
  "Cancelado": "bg-red-600/20 text-red-400",
  
  // Outros
  "Spam": "bg-red-700/20 text-red-500",
  "Bloqueado": "bg-red-800/20 text-red-600",
  "Ativo": "bg-green-700/20 text-green-500",
  "Inativo": "bg-gray-600/20 text-gray-500",
  "Novo": "bg-blue-600/20 text-blue-500",
  "Antigo": "bg-gray-700/20 text-gray-600",
  "VIP": "bg-gold-500/20 text-gold-400",
  "Premium": "bg-purple-600/20 text-purple-400"
}; 