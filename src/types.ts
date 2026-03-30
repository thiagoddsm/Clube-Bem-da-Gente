export interface UserProfile {
  nome: string;
  email: string;
  matricula: string;
  empresa: string;
  cpf: string;
  senha_criada: boolean;
  foto_url?: string;
  status: 'ativo' | 'pendente' | 'bloqueado';
  role?: 'admin' | 'user';
  telefone?: string;
  data_nascimento?: string;
  adimplente?: boolean;
}

export interface PreRegistration {
  cpf: string;
  nome: string;
  matricula: string;
  empresa: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderNome: string;
  text: string;
  createdAt: any;
}

export interface ChatSession {
  id?: string;
  userId: string;
  userNome: string;
  lastMessage?: string;
  lastUpdate: any;
  status: 'aberto' | 'fechado';
}

export interface UsageHistory {
  id: string;
  userId: string;
  tipo: 'consulta' | 'telemedicina' | 'desconto' | 'exame' | 'outro';
  titulo: string;
  descricao: string;
  data: any;
  valor_original?: number;
  valor_pago?: number;
}

export interface InsuranceInfo {
  id: string;
  userId: string;
  plano: string;
  cobertura: number;
  status: 'ativo' | 'pendente' | 'cancelado';
  data_inicio: any;
  beneficiarios: string[];
}

export interface Sweepstake {
  id: string;
  mes: string;
  ano: number;
  premio: string;
  ganhador_nome?: string;
  ganhador_matricula?: string;
  data_sorteio: any;
  status: 'realizado' | 'agendado';
}

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'agendamento' | 'suporte' | 'promocao';
  read: boolean;
  createdAt: any;
  link?: string;
}

export interface Partner {
  id?: string;
  nome: string;
  categoria: string;
  link_whatsapp: string;
  foto_url?: string;
  endereco?: string;
  tipo?: 'propria' | 'credenciada';
  especialidade?: string;
  servicos?: ('consulta' | 'exame')[];
}

export interface Company {
  id?: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  adimplente: boolean;
  createdAt: any;
}

export interface Config {
  especialidades: string[];
  exames: string[];
  categorias: string[];
}
