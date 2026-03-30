/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  CreditCard, 
  Stethoscope, 
  Video, 
  Pill, 
  MessageCircle, 
  TrendingUp, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
  ShieldCheck,
  Leaf,
  Search,
  AlertCircle,
  Loader2,
  ExternalLink,
  GraduationCap,
  Palmtree,
  History,
  MapPin,
  Clock,
  Info,
  Check,
  Plus,
  Minus,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Smartphone,
  Star,
  ArrowRight,
  HelpCircle,
  Quote,
  Phone,
  Users,
  Building2,
  Building,
  Settings,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  Send,
  Bell,
  Megaphone,
  MessageSquare,
  Download,
  Camera,
  CheckCircle,
  Heart,
  Activity,
  FlaskConical,
  Eye,
  Smile,
  Thermometer,
  Zap,
  Shield,
  Edit2,
  FileText,
  QrCode,
  Share2,
  Upload,
  Map,
  ShoppingBag,
  MoreHorizontal,
  Utensils,
  Dumbbell,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import * as XLSX from 'xlsx';
import { Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { auth, db, loginWithGoogle, loginWithEmail, registerWithEmail, logout, checkPreRegistration, loginWithCPF, registerWithCPF, uploadFile, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, setDoc, addDoc, getDocs, updateDoc, deleteDoc, where, limit, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { UserProfile, PreRegistration, ChatMessage, ChatSession, AppNotification, UsageHistory, InsuranceInfo, Sweepstake, Partner, Company, Config } from './types';


// --- Helpers ---

const generateMatricula = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CB-${random}`;
};

// --- Components ---

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      try {
        const errInfo = JSON.parse(this.state.error.message);
        if (errInfo.error.includes("insufficient permissions")) {
          displayMessage = "Você não tem permissão para realizar esta operação.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Oops! Algo deu errado</h1>
            <p className="text-slate-400">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Sub-components for Landing Page ---

const LoginPage = ({ 
  onLogin, 
  onLoginWithCPF, 
  onFirstAccess 
}: { 
  onLogin: () => void, 
  onLoginWithCPF: (cpf: string, pass: string) => Promise<void>,
  onFirstAccess: (cpf: string, pass: string, data: any, phone: string, email: string, birthDate: string) => Promise<void>
}) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [step, setStep] = useState<'login' | 'first-access-check' | 'first-access-setup'>('login');
  const [preRegData, setPreRegData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setParsedError = (err: any) => {
    try {
      const parsed = JSON.parse(err);
      if (parsed.error && parsed.error.toLowerCase().includes('insufficient permissions')) {
        setError(`Erro de permissão no Firestore: ${parsed.operationType} em ${parsed.path}. Por favor, verifique as regras de segurança.`);
      } else {
        setError(parsed.error || err);
      }
    } catch (e) {
      setError(err);
    }
  };

  const [passwordError, setPasswordError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "A senha deve conter pelo menos uma letra maiúscula.";
    if (!/[a-z]/.test(pass)) return "A senha deve conter pelo menos uma letra minúscula.";
    if (!/[0-9]/.test(pass)) return "A senha deve conter pelo menos um número.";
    return "";
  };

  const handleCpfChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    let formatted = clean;
    if (clean.length > 3) formatted = clean.slice(0, 3) + '.' + clean.slice(3);
    if (clean.length > 6) formatted = formatted.slice(0, 7) + '.' + clean.slice(6);
    if (clean.length > 9) formatted = formatted.slice(0, 11) + '-' + clean.slice(9);
    setCpf(formatted);
  };

  const handleBirthDateChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + clean.slice(4);
    setBirthDate(formatted);
  };

  const handleCheckCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await checkPreRegistration(cpf);
      if (data) {
        setPreRegData(data);
        setStep('first-access-setup');
      } else {
        setError("CPF não encontrado na base de dados pré-habilitados.");
      }
    } catch (err) {
      setError("Erro ao verificar CPF.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLoginWithCPF(cpf, password);
    } catch (err: any) {
      setError("CPF ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(password);
    if (passErr) {
      setPasswordError(passErr);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onFirstAccess(cpf, password, preRegData, phone, email, birthDate);
    } catch (err: any) {
      setError("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-tertiary/5 blur-[120px] rounded-full -ml-20 -mb-20" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-xl shadow-black/5 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-48 h-24 mx-auto mb-6 relative">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0141108959.firebasestorage.app/o/Menor%404x.png?alt=media&token=ade63b29-8ece-44a3-81b2-16f4382b5ad5" 
              alt="Bem da Gente Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'login' ? 'Bem-vindo' : step === 'first-access-check' ? 'Primeiro Acesso' : 'Crie sua Senha'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {step === 'login' ? 'Faça login para acessar seus benefícios' : 
             step === 'first-access-check' ? 'Insira seu CPF para habilitar sua conta' : 
             `Olá, ${preRegData?.nome}. Defina uma senha segura.`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 mb-6">
            <div>
              <input 
                type="text" 
                required
                value={cpf}
                onChange={e => handleCpfChange(e.target.value)}
                placeholder="Seu CPF"
                className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {step === 'first-access-check' && (
          <form onSubmit={handleCheckCpf} className="space-y-4 mb-6">
            <div>
              <input 
                type="text" 
                required
                value={cpf}
                onChange={e => handleCpfChange(e.target.value)}
                placeholder="Seu CPF"
                className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar CPF'}
            </button>
          </form>
        )}

        {step === 'first-access-setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-4 mb-6">
            <div>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Crie uma senha"
                className={`w-full bg-slate-50 border ${passwordError ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-black/5 focus:ring-primary/20 focus:border-primary'} rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 transition-all`}
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-2 ml-2">{passwordError}</p>
              )}
            </div>
            <div>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  let formatted = val;
                  if (val.length > 2) formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                  if (val.length > 7) formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                  setPhone(formatted);
                }}
                placeholder="Número de celular (WhatsApp)"
                className="w-full bg-slate-50 border border-black/5 focus:ring-primary/20 focus:border-primary rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="w-full bg-slate-50 border border-black/5 focus:ring-primary/20 focus:border-primary rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <input 
                type="text" 
                required
                value={birthDate}
                onChange={e => handleBirthDateChange(e.target.value)}
                placeholder="Data de Nascimento (DD/MM/AAAA)"
                className="w-full bg-slate-50 border border-black/5 focus:ring-primary/20 focus:border-primary rounded-2xl p-4 text-slate-900 focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Finalizando...' : 'Concluir Cadastro'}
            </button>
          </form>
        )}

        {step === 'login' && (
          <div className="space-y-6">
            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Novo por aqui?</h4>
                <p className="text-[10px] text-slate-500 mt-1">Habilite sua conta usando seu CPF para acessar seus benefícios.</p>
              </div>
              <button 
                onClick={() => {
                  setStep('first-access-check');
                  setError(null);
                }}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
              >
                Primeiro Acesso <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        <div className="text-center mt-6">
          <button 
            onClick={() => {
              setStep(step === 'login' ? 'first-access-check' : 'login');
              setError(null);
            }}
            className="text-sm text-primary hover:underline font-bold"
          >
            {step === 'login' ? '' : 'Voltar para o login'}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            Ao continuar, você concorda com nossos <br/>
            <a href="#" className="text-primary hover:underline">Termos de Serviço</a> e <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Loader2 className="w-12 h-12 text-emerald-500" />
    </motion.div>
    <p className="mt-4 text-slate-400 font-medium animate-pulse">Carregando sua saúde...</p>
  </div>
);

const AdminLoginPage = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-xl shadow-black/5"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acesso Administrativo</h2>
        <p className="text-sm text-slate-500 mt-2">Faça login para acessar o painel administrativo.</p>
      </div>
      <button 
        onClick={onLogin}
        className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Entrar com Google
      </button>
    </motion.div>
  </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string, onRetry?: () => void }) => {
  let displayMessage = message;
  try {
    const parsed = JSON.parse(message);
    if (parsed.error) {
      displayMessage = `Erro no Firestore (${parsed.operationType}): ${parsed.error}`;
    }
  } catch (e) {
    // Not a JSON error
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-red-500/20 p-8 rounded-3xl max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Ocorreu um Erro</h2>
        <p className="text-slate-400 mb-6">{displayMessage}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all"
          >
            Tentar Novamente
          </button>
        )}
        <button 
          onClick={() => logout()}
          className="mt-4 text-slate-500 hover:text-white transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
};

const SupportChat = ({ profile, setError }: { profile: UserProfile | null, setError: (msg: string | null) => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Find or create chat session
    const q = query(collection(db, 'chats'), where('userId', '==', auth.currentUser.uid), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setChatId(snapshot.docs[0].id);
      } else {
        // Create new session
        const newSession: ChatSession = {
          userId: auth.currentUser!.uid,
          userNome: profile?.nome || "Usuário",
          lastUpdate: serverTimestamp(),
          status: 'aberto'
        };
        addDoc(collection(db, 'chats'), newSession).then(docRef => {
          setChatId(docRef.id);
        }).catch(err => {
          try {
            handleFirestoreError(err, OperationType.CREATE, 'chats');
          } catch (jsonErr: any) {
            setError(jsonErr.message);
          }
        });
      }
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'chats');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser, profile, setError]);

  useEffect(() => {
    if (!chatId) return;

    const q = query(collection(db, 'chats', chatId, 'mensagens'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}/mensagens`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !auth.currentUser) return;

    const msg: ChatMessage = {
      senderId: auth.currentUser.uid,
      senderNome: profile?.nome || "Usuário",
      text: newMessage,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'chats', chatId, 'mensagens'), msg);
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage,
        lastUpdate: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/mensagens`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[80vh] bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden">
      <div className="p-6 bg-slate-800 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <div>
            <h3 className="font-bold text-white">Suporte ao Beneficiário</h3>
            <p className="text-[10px] text-emerald-500 uppercase font-bold">Online agora</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-500" /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.senderId === auth.currentUser?.uid ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
              <p className="text-sm">{msg.text}</p>
              <p className="text-[8px] opacity-50 mt-1 text-right">
                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Enviando...'}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-white/5 flex gap-2">
        <input 
          type="text" 
          placeholder="Digite sua mensagem..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
        />
        <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition-all"><Send className="w-5 h-5" /></button>
      </form>
    </motion.div>
  );
};

const NotificationCenter = ({ setError }: { setError: (msg: string | null) => void }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notificacoes'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppNotification[];
      setNotifications(data);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'notificacoes');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser, setError]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notificacoes', id), { read: true });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `notificacoes/${id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight className="w-6 h-6 rotate-180" /></button>
        <h2 className="text-2xl font-bold text-white">Notificações</h2>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            onClick={() => {
              if (notif.id) markAsRead(notif.id);
              if (notif.link) navigate(notif.link);
            }}
            className={`p-6 hover:bg-white/5 transition-all cursor-pointer flex gap-4 ${!notif.read ? 'bg-emerald-500/5' : ''}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              notif.type === 'agendamento' ? 'bg-blue-500/10 text-blue-500' :
              notif.type === 'suporte' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-orange-500/10 text-orange-500'
            }`}>
              {notif.type === 'agendamento' ? <Calendar className="w-6 h-6" /> :
               notif.type === 'suporte' ? <MessageCircle className="w-6 h-6" /> :
               <Bell className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-bold text-sm">{notif.title}</h4>
                <p className="text-[10px] text-slate-600 uppercase font-bold">
                  {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
              {!notif.read && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mt-2" />}
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="p-12 text-center text-slate-500">Você não tem notificações no momento.</div>
        )}
      </div>
    </motion.div>
  );
};

const NotificationBell = ({ setError }: { setError: (msg: string | null) => void }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notificacoes'), 
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'notificacoes');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  return (
    <button 
      onClick={() => navigate('/notificacoes')}
      className="relative p-3 bg-slate-900 border border-white/10 rounded-2xl hover:bg-slate-800 transition-all group"
    >
      <Bell className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

const ProfilePage = ({ profile, setProfile, setError, setSuccess }: { profile: UserProfile | null, setProfile: (p: UserProfile | null) => void, setError: (m: string | null) => void, setSuccess: (m: string | null) => void }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem é muito grande. O limite é 5MB.");
      return;
    }

    setUploading(true);
    try {
      const path = `profiles/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        foto_url: url
      });

      if (profile) {
        setProfile({ ...profile, foto_url: url });
      }
      setSuccess("Foto de perfil atualizada com sucesso!");
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setError(err.message || "Erro ao fazer upload da foto. Verifique se o serviço de Storage está ativo.");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180 text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Meu Perfil</h2>
      </div>

      <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden relative">
              {profile.foto_url ? (
                <img src={profile.foto_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                  {profile.nome.charAt(0)}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900">{profile.nome}</h3>
            <p className="text-slate-500 text-sm">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "CPF", value: profile.cpf },
            { label: "Matrícula", value: profile.matricula },
            { label: "Empresa", value: profile.empresa },
            { label: "Telefone", value: profile.telefone || "Não informado" },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-black/5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm font-bold text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => logout()}
          className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>
      </div>
    </motion.div>
  );
};

const AdminChatList = ({ setError }: { setError: (msg: string | null) => void }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastUpdate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatSession[];
      setChats(chatData);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'chats');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });
    return () => unsubscribe();
  }, []);

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;
    try {
      await deleteDoc(doc(db, 'chats', chatToDelete));
      setShowDeleteConfirm(false);
      setChatToDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `chats/${chatToDelete}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronRight className="w-6 h-6 rotate-180" /></button>
        <h2 className="text-2xl font-bold text-slate-900">Suporte ao Cliente</h2>
      </div>

      <div className="bg-white border border-black/5 rounded-[2rem] overflow-hidden divide-y divide-black/5 shadow-sm">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => navigate(`/admin/chats/${chat.id}`)}
            className="p-6 hover:bg-slate-50 transition-all cursor-pointer flex justify-between items-center group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
                {chat.userNome.charAt(0)}
              </div>
              <div>
                <h4 className="text-slate-900 font-bold group-hover:text-primary transition-colors">{chat.userNome}</h4>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{chat.lastMessage || "Sem mensagens"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  {chat.lastUpdate?.seconds ? new Date(chat.lastUpdate.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                </p>
                {chat.status === 'aberto' && <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mt-1" />}
              </div>
              <button 
                onClick={(e) => deleteChat(e, chat.id)}
                className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                title="Excluir Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {chats.length === 0 && <div className="p-12 text-center text-slate-400">Nenhum chat encontrado.</div>}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Excluir Chat?</h3>
                <p className="text-sm text-slate-500">
                  Tem certeza que deseja excluir este histórico de chat? 
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setChatToDelete(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AdminChatRoom = ({ setError }: { setError: (msg: string | null) => void }) => {
  const { id } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState<ChatSession | null>(null);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const chatRef = doc(db, 'chats', id);
    const unsubscribeChat = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) setChat({ id: doc.id, ...doc.data() } as ChatSession);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `chats/${id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });

    const q = query(collection(db, 'chats', id, 'mensagens'), orderBy('createdAt', 'asc'));
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `chats/${id}/mensagens`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    });

    return () => {
      unsubscribeChat();
      unsubscribeMsgs();
    };
  }, [id, setError]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !auth.currentUser) return;

    const msg: ChatMessage = {
      senderId: auth.currentUser.uid,
      senderNome: "Suporte",
      text: newMessage,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'chats', id, 'mensagens'), msg);
      await updateDoc(doc(db, 'chats', id), {
        lastMessage: newMessage,
        lastUpdate: serverTimestamp()
      });

      // Send notification to user
      if (chat?.userId) {
        await addDoc(collection(db, 'notificacoes'), {
          userId: chat.userId,
          title: "Nova mensagem de suporte",
          message: newMessage.substring(0, 50) + (newMessage.length > 50 ? "..." : ""),
          type: 'suporte',
          read: false,
          createdAt: serverTimestamp(),
          link: '/chat'
        });
      }

      setNewMessage('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `chats/${id}/mensagens`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[80vh] bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-xl">
      <div className="p-6 bg-white border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/chats')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <div>
            <h3 className="font-bold text-slate-900">Chat com {chat?.userNome}</h3>
            <p className="text-[10px] text-primary uppercase font-bold tracking-wider">Atendimento ao Beneficiário</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.senderId === auth.currentUser?.uid ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-black/5 text-slate-700 rounded-tl-none'}`}>
              <p className={`text-[10px] font-bold mb-1 uppercase tracking-tight ${msg.senderId === auth.currentUser?.uid ? 'text-white/70' : 'text-primary'}`}>{msg.senderNome}</p>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[8px] mt-1 text-right ${msg.senderId === auth.currentUser?.uid ? 'text-white/50' : 'text-slate-400'}`}>
                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('pt-BR') : '...'}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-black/5 flex gap-2">
        <input 
          type="text" 
          placeholder="Digite a resposta..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-slate-50 border border-black/5 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <button type="submit" className="bg-primary hover:bg-primary-dark text-white p-3 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"><Send className="w-5 h-5" /></button>
      </form>
    </motion.div>
  );
};

const AdminDashboard = ({ 
  setError, 
  setParsedError,
  setSuccess, 
  users, 
  preRegs, 
  loading: adminLoading, 
  setLoading: setAdminLoading,
  companies,
  partners,
  profile,
  config,
  setConfig
}: { 
  setError: (msg: string | null) => void, 
  setParsedError: (err: any) => void,
  setSuccess: (msg: string | null) => void,
  users: (UserProfile & { id: string })[],
  preRegs: (UserProfile & { id: string })[],
  loading: boolean,
  setLoading: (val: boolean) => void,
  companies: (Company & { id: string })[],
  partners: (Partner & { id: string })[],
  profile: UserProfile | null,
  config: Config,
  setConfig: (c: Config) => void
}) => {
  const [filter, setFilter] = useState<'todos' | 'ativos' | 'pendentes' | 'bloqueados'>('todos');
  const [empresaFilter, setEmpresaFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPartnerDeleteConfirm, setShowPartnerDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string, isPendente: boolean, nome: string } | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string, nome: string } | null>(null);
  const [newUser, setNewUser] = useState({ nome: '', email: '', empresa: '', cpf: '', telefone: '' });
  const [editingUser, setEditingUser] = useState<(UserProfile & { id: string }) | null>(null);
  const [sendingPromo, setSendingPromo] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios' | 'parceiros' | 'empresas' | 'configuracoes' | 'financeiro'>('dashboard');
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'usuarios', 'parceiros', 'empresas', 'configuracoes', 'financeiro'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ nome: '', cnpj: '', telefone: '', email: '' });
  const [editingCompany, setEditingCompany] = useState<(Company & { id: string }) | null>(null);

  const usersList = [...users, ...preRegs];
  const empresasList = Array.from(new Set([...companies.map(c => c.nome), ...usersList.map(u => u.empresa)])).filter(Boolean);
  const activeCount = usersList.filter(u => u.status === 'ativo').length;
  const pendingCount = usersList.filter(u => u.status === 'pendente').length;
  const blockedCount = usersList.filter(u => u.status === 'bloqueado').length;

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.nome.trim()) return;

    // Format CNPJ and Phone if provided
    let formattedCnpj = newCompany.cnpj.replace(/\D/g, '');
    if (formattedCnpj.length === 14) {
      formattedCnpj = formattedCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }

    let formattedPhone = newCompany.telefone.replace(/\D/g, '');
    if (formattedPhone.length === 11) {
      formattedPhone = formattedPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (formattedPhone.length === 10) {
      formattedPhone = formattedPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }

    try {
      await addDoc(collection(db, 'empresas'), {
        nome: newCompany.nome,
        cnpj: formattedCnpj || newCompany.cnpj,
        telefone: formattedPhone || newCompany.telefone,
        email: newCompany.email,
        adimplente: true,
        createdAt: serverTimestamp()
      });
      setNewCompany({ nome: '', cnpj: '', telefone: '', email: '' });
      setShowAddCompanyModal(false);
      setSuccess("Empresa adicionada com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'empresas');
      } catch (jsonErr: any) {
        setParsedError(jsonErr.message);
      }
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    // Format CNPJ and Phone if provided
    let formattedCnpj = editingCompany.cnpj.replace(/\D/g, '');
    if (formattedCnpj.length === 14) {
      formattedCnpj = formattedCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }

    let formattedPhone = editingCompany.telefone.replace(/\D/g, '');
    if (formattedPhone.length === 11) {
      formattedPhone = formattedPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (formattedPhone.length === 10) {
      formattedPhone = formattedPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }

    try {
      await updateDoc(doc(db, 'empresas', editingCompany.id), {
        nome: editingCompany.nome,
        cnpj: formattedCnpj || editingCompany.cnpj || '',
        telefone: formattedPhone || editingCompany.telefone || '',
        email: editingCompany.email || '',
        adimplente: editingCompany.adimplente
      });
      setShowEditCompanyModal(false);
      setEditingCompany(null);
      setSuccess("Empresa atualizada com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `empresas/${editingCompany.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const toggleCompanyAdimplencia = async (company: Company & { id: string }) => {
    try {
      const newAdimplenteStatus = !(company.adimplente ?? true);
      
      // Update company
      await updateDoc(doc(db, 'empresas', company.id), { 
        adimplente: newAdimplenteStatus 
      });

      // Update all employees of this company
      const employees = users.filter(u => u.empresa === company.nome);
      const batch = writeBatch(db);
      employees.forEach(emp => {
        batch.update(doc(db, 'users', emp.id), { adimplente: newAdimplenteStatus });
      });
      await batch.commit();
      
      setSuccess(`Status da empresa e de ${employees.length} funcionários atualizado com sucesso!`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `empresas/${company.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'empresas', id));
      setSuccess("Empresa excluída com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `empresas/${id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        const nome = row.nome || row.Nome || row.NOME;
        const cpf = row.cpf || row.CPF || row.Cpf;
        const email = row.email || row.Email || row.EMAIL || '';
        const telefone = row.telefone || row.Telefone || row.TELEFONE || '';
        const empresa = row.empresa || row.Empresa || row.EMPRESA || 'Importado';

        if (!nome || !cpf) {
          errorCount++;
          continue;
        }

        const cleanCpf = String(cpf).replace(/\D/g, '');

        // Check for duplicate CPF
        const cpfExists = usersList.some(u => u.cpf.replace(/\D/g, '') === cleanCpf);
        if (cpfExists) {
          errorCount++;
          continue;
        }

        try {
          await setDoc(doc(db, 'pre_registrations', cleanCpf), {
            nome,
            cpf: cleanCpf,
            email,
            telefone,
            empresa,
            matricula: generateMatricula(),
          });
          successCount++;
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.CREATE, 'pre_registrations');
          } catch (jsonErr: any) {
            console.error("Erro na importação:", jsonErr.message);
          }
          errorCount++;
        }
      }

      setSuccess(`Importação concluída! Sucesso: ${successCount}, Erros: ${errorCount}`);
    } catch (err) {
      setError("Erro ao ler o arquivo. Verifique se o formato está correto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showEditPartnerModal, setShowEditPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<(Partner & { id: string }) | null>(null);
  const [newPartner, setNewPartner] = useState({ 
    nome: '', 
    categoria: '', 
    link_whatsapp: '', 
    foto_url: null as string | null,
    endereco: '',
    tipo: 'propria' as 'propria' | 'credenciada',
    especialidade: '',
    servicos: [] as ('consulta' | 'exame')[]
  });

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      const partnerData = { ...editingPartner };
      delete (partnerData as any).id;
      if (!partnerData.foto_url) delete (partnerData as any).foto_url;

      await updateDoc(doc(db, 'parceiros', editingPartner.id), {
        ...partnerData,
        servicos: editingPartner.servicos
      });
      setShowEditPartnerModal(false);
      setEditingPartner(null);
      setSuccess("Parceiro atualizado com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `parceiros/${editingPartner.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const toggleAdimplencia = async (user: UserProfile & { id: string }) => {
    if (user.status === 'pendente') return;
    try {
      await updateDoc(doc(db, 'users', user.id), { adimplente: user.adimplente === false ? true : false });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };


  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.cpf || !newUser.nome) return;

    const cleanCpf = newUser.cpf.replace(/\D/g, '');
    
    // Check for duplicate CPF
    const cpfExists = usersList.some(u => u.cpf.replace(/\D/g, '') === cleanCpf);
    if (cpfExists) {
      setError("Já existe um usuário cadastrado com este CPF.");
      return;
    }

    try {
      await setDoc(doc(db, 'pre_registrations', cleanCpf), {
        ...newUser,
        cpf: cleanCpf,
        matricula: generateMatricula(),
      });
      setNewUser({ nome: '', email: '', empresa: '', cpf: '', telefone: '' });
      setShowAddModal(false);
      setSuccess("Usuário pré-cadastrado com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'pre_registrations');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const [showAuthConfirm, setShowAuthConfirm] = useState(false);
  const [userToAuth, setUserToAuth] = useState<string | null>(null);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    if (currentStatus === 'pendente') {
      setUserToAuth(userId);
      setShowAuthConfirm(true);
      return;
    }
    
    let newStatus: 'ativo' | 'bloqueado' = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const confirmAuth = async () => {
    if (!userToAuth) return;
    try {
      const user = preRegs.find(p => p.id === userToAuth);
      if (!user) return;
      
      await setDoc(doc(db, 'users', userToAuth), {
        ...user,
        status: 'ativo',
        senha_criada: false,
        createdAt: serverTimestamp()
      });
      
      await deleteDoc(doc(db, 'pre_registrations', userToAuth));
      setSuccess("Usuário autorizado! Agora ele pode realizar o primeiro acesso.");
      setShowAuthConfirm(false);
      setUserToAuth(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${userToAuth}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.nome || !newPartner.link_whatsapp) return;

    try {
      const partnerData = { ...newPartner };
      if (!partnerData.foto_url) delete (partnerData as any).foto_url;
      
      await addDoc(collection(db, 'parceiros'), {
        ...partnerData,
        servicos: newPartner.servicos
      });
      setNewPartner({ 
        nome: '', 
        categoria: '', 
        link_whatsapp: '', 
        foto_url: null, 
        endereco: '',
        tipo: 'propria',
        especialidade: '',
        servicos: []
      });
      setShowAddPartnerModal(false);
      setSuccess("Parceiro adicionado com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'parceiros');
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const deletePartner = async (partnerId: string, nome: string) => {
    setPartnerToDelete({ id: partnerId, nome });
    setShowPartnerDeleteConfirm(true);
  };

  const confirmPartnerDelete = async () => {
    if (!partnerToDelete) return;
    try {
      await deleteDoc(doc(db, 'parceiros', partnerToDelete.id));
      setSuccess("Parceiro excluído!");
      setShowPartnerDeleteConfirm(false);
      setPartnerToDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `parceiros/${partnerToDelete.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const deleteUser = async (userId: string, isPendente: boolean, nome: string) => {
    setUserToDelete({ id: userId, isPendente, nome });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, userToDelete.isPendente ? 'pre_registrations' : 'users', userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `${userToDelete.isPendente ? 'pre_registrations' : 'users'}/${userToDelete.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };

  const editUser = (user: UserProfile & { id: string }) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const isPendente = editingUser.status === 'pendente';
    const collectionName = isPendente ? 'pre_registrations' : 'users';
    const cleanCpf = editingUser.cpf.replace(/\D/g, '');

    // Check for duplicate CPF (excluding current user)
    const cpfExists = usersList.some(u => u.id !== editingUser.id && u.cpf.replace(/\D/g, '') === cleanCpf);
    if (cpfExists) {
      setError("Já existe outro usuário cadastrado com este CPF.");
      return;
    }
    
    try {
      await updateDoc(doc(db, collectionName, editingUser.id), {
        nome: editingUser.nome,
        cpf: cleanCpf,
        telefone: editingUser.telefone || "",
        data_nascimento: editingUser.data_nascimento || "",
        matricula: editingUser.matricula || "",
        empresa: editingUser.empresa,
        email: editingUser.email || "",
        role: editingUser.role || 'user',
        status: editingUser.status
      });
      setShowEditModal(false);
      setEditingUser(null);
      setSuccess("Usuário atualizado com sucesso!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${editingUser.id}`);
      } catch (jsonErr: any) {
        setError(jsonErr.message);
      }
    }
  };


  const filteredUsers = usersList.filter(u => {
    const isAtivo = u.status === 'ativo';
    const isPendente = u.status === 'pendente';
    const isBloqueado = u.status === 'bloqueado';

    const matchesFilter = 
      filter === 'ativos' ? isAtivo : 
      filter === 'pendentes' ? isPendente : 
      filter === 'bloqueados' ? isBloqueado : true;

    const matchesEmpresa = empresaFilter === 'todas' || u.empresa === empresaFilter;
    const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.cpf.includes(searchTerm) || 
                         u.matricula.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesEmpresa && matchesSearch;
  });

  const downloadTemplate = () => {
    const templateData = [
      { 
        nome: "Exemplo Nome", 
        cpf: "000.000.000-00", 
        email: "email@exemplo.com", 
        telefone: "(00) 00000-0000", 
        empresa: companies[0]?.nome || "Copie o nome exato da aba 'Empresas'" 
      }
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // nome
      { wch: 15 }, // cpf
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 35 }, // empresa
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    
    // Add a sheet with companies list for reference
    const companiesData = companies.map(c => ({ 
      "Nome da Empresa (Copie este nome)": c.nome, 
      "CNPJ": c.cnpj 
    }));
    const wsCompanies = XLSX.utils.json_to_sheet(companiesData);
    wsCompanies['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsCompanies, "Empresas");
    
    XLSX.writeFile(wb, "modelo_importacao_usuarios.xlsx");
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportToCSV(usersList, 'usuarios')}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => navigate('/admin/chats')}
            className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/20 transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> Chats
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Usuários', value: usersList.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Ativos', value: activeCount, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pendentes', value: pendingCount, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Bloqueados', value: blockedCount, icon: UserX, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-black/5 p-4 rounded-3xl shadow-sm space-y-2"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white rounded-2xl border border-black/5 shadow-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'usuarios' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Users className="w-3.5 h-3.5" /> Usuários {pendingCount > 0 && <span className="bg-tertiary text-white px-1 py-0 rounded-full text-[8px]">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setActiveTab('parceiros')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'parceiros' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Building2 className="w-3.5 h-3.5" /> Parceiros
        </button>
        <button
          onClick={() => setActiveTab('empresas')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'empresas' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Building className="w-3.5 h-3.5" /> Empresas
        </button>
        <button
          onClick={() => setActiveTab('configuracoes')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'configuracoes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Settings className="w-3.5 h-3.5" /> Config.
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`min-w-[80px] flex-1 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'financeiro' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Financeiro
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Usuários por Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Ativos', value: activeCount },
                      { name: 'Pendentes', value: pendingCount },
                      { name: 'Bloqueados', value: blockedCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-bold uppercase">
              <div className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Ativos</div>
              <div className="flex items-center gap-1 text-orange-500"><div className="w-2 h-2 rounded-full bg-orange-500" /> Pendentes</div>
              <div className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500" /> Bloqueados</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Usuários por Empresa</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(usersList.reduce((acc, u) => {
                  acc[u.empresa] = (acc[u.empresa] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar por nome, CPF ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2 p-1 bg-white rounded-2xl border border-black/5 shadow-sm overflow-x-auto no-scrollbar">
              {(['todos', 'ativos', 'pendentes', 'bloqueados'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 min-w-[80px] py-2 px-4 rounded-xl text-xs font-bold capitalize transition-all ${filter === f ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <select
              value={empresaFilter}
              onChange={(e) => setEmpresaFilter(e.target.value)}
              className="bg-white border border-black/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none shadow-sm"
            >
              <option value="todas">Todas as Empresas</option>
              {empresasList.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-slate-900">Gerenciar Beneficiários</h3>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={downloadTemplate}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" /> Baixar Planilha Modelo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, .xlsx, .xlsm" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Importar
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                  <UserPlus className="w-4 h-4" /> Novo Usuário
                </button>
              </div>
            </div>

            <div className="divide-y divide-black/5">
              {adminLoading ? (
                <div className="p-12 text-center text-slate-400">Carregando usuários...</div>
              ) : filteredUsers.map((u) => (
                <div key={u.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-black/5 overflow-hidden flex items-center justify-center">
                      {u.foto_url ? <img src={u.foto_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Users className="w-6 h-6 text-slate-400" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{u.nome}</p>
                      <p className="text-xs text-slate-500">{u.email || 'Sem e-mail'} • {u.matricula}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">CPF: {u.cpf} {u.telefone && `• Tel: ${u.telefone}`}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          u.status === 'ativo' ? 'bg-emerald-100 text-emerald-600' : 
                          u.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {u.status === 'ativo' ? 'Ativo' : 
                           u.status === 'pendente' ? 'Pendente' : 
                           'Bloqueado'}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                          {u.role || 'user'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleAdimplencia(u)}
                      className={`p-2 rounded-xl transition-all ${u.adimplente === false ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}
                      title={u.adimplente === false ? "Marcar como Adimplente" : "Marcar como Inadimplente"}
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => editUser(u)}
                      className="p-2 bg-slate-50 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => toggleUserStatus(u.id, u.status)}
                      className={`p-2 rounded-xl transition-all ${u.status === 'ativo' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                      title={u.status === 'ativo' ? "Bloquear" : "Ativar"}
                    >
                      {u.status === 'ativo' ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id, u.status === 'pendente', u.nome)}
                      className="p-2 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parceiros' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Gerenciar Parceiros</h3>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex-1 relative md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar parceiro..."
                  value={partnerSearchTerm}
                  onChange={(e) => setPartnerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowAddPartnerModal(true)}
                className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Novo Parceiro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.filter(p => p.nome.toLowerCase().includes(partnerSearchTerm.toLowerCase()) || p.categoria.toLowerCase().includes(partnerSearchTerm.toLowerCase())).map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-black/5 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
                    {p.foto_url ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Building2 className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{p.nome}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{p.categoria}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  {p.endereco && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" /> {p.endereco}
                    </p>
                  )}
                  {p.link_whatsapp && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" /> {p.link_whatsapp}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
            {partners.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                Nenhum parceiro cadastrado.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'empresas' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900">Gerenciar Empresas</h3>
            <button 
              onClick={() => setShowAddCompanyModal(true)}
              className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Nova Empresa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <motion.div 
                key={company.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">{company.nome}</h4>
                    {company.cnpj && <p className="text-[10px] text-slate-500 font-mono">CNPJ: {company.cnpj}</p>}
                    {company.telefone && <p className="text-[10px] text-slate-500">Tel: {company.telefone}</p>}
                    {company.email && <p className="text-[10px] text-slate-500">E-mail: {company.email}</p>}
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">
                      {users.filter(u => u.empresa === company.nome).length} Funcionários
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setEditingCompany(company);
                        setShowEditCompanyModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteCompany(company.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-600">Status de Pagamento</span>
                  <button
                    onClick={() => toggleCompanyAdimplencia(company)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${(company.adimplente ?? true) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
                  >
                    {(company.adimplente ?? true) ? 'Adimplente' : 'Inadimplente'}
                  </button>
                </div>
              </motion.div>
            ))}
            {companies.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                Nenhuma empresa cadastrada.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'configuracoes' && (
        <div className="space-y-6">
          <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Configurações do Sistema</h3>
                <p className="text-slate-500 text-sm">Gerencie as listas de especialidades, exames e categorias.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Especialidades */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Especialidades
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {config.especialidades.map((esp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                      <span className="text-sm text-slate-700 font-medium">{esp}</span>
                      <button 
                        onClick={() => {
                          const newList = config.especialidades.filter((_, idx) => idx !== i);
                          const newConfig = { ...config, especialidades: newList };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                        }}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nova especialidade..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !config.especialidades.includes(val)) {
                          const newConfig = { ...config, especialidades: [...config.especialidades, val] };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Exames */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" /> Exames
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {config.exames.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                      <span className="text-sm text-slate-700 font-medium">{ex}</span>
                      <button 
                        onClick={() => {
                          const newList = config.exames.filter((_, idx) => idx !== i);
                          const newConfig = { ...config, exames: newList };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                        }}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Novo exame..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !config.exames.includes(val)) {
                          const newConfig = { ...config, exames: [...config.exames, val] };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Categorias */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" /> Categorias
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {config.categorias.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                      <span className="text-sm text-slate-700 font-medium">{cat}</span>
                      <button 
                        onClick={() => {
                          const newList = config.categorias.filter((_, idx) => idx !== i);
                          const newConfig = { ...config, categorias: newList };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                        }}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nova categoria..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !config.categorias.includes(val)) {
                          const newConfig = { ...config, categorias: [...config.categorias, val] };
                          setDoc(doc(db, 'config', 'main'), newConfig);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Financeiro</h3>
                <p className="text-slate-500 text-sm">Gerencie pagamentos e assinaturas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Recebido', value: 'R$ 12.500,00', color: 'text-emerald-600' },
                { label: 'Pendente', value: 'R$ 3.200,00', color: 'text-amber-600' },
                { label: 'Total de Transações', value: '48', color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-black/5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-4">Histórico de Transações</h4>
              <div className="space-y-4">
                {[
                  { id: 1, desc: 'Pagamento Empresa Teste', date: '27/03/2026', valor: 'R$ 1.500,00', status: 'Pago' },
                  { id: 2, desc: 'Pagamento Igreja', date: '26/03/2026', valor: 'R$ 2.000,00', status: 'Pendente' },
                ].map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{t.desc}</p>
                      <p className="text-[10px] text-slate-400">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{t.valor}</p>
                      <p className={`text-[10px] font-bold ${t.status === 'Pago' ? 'text-emerald-500' : 'text-amber-500'}`}>{t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">
                Exportar Relatório
              </button>
              <button 
                onClick={() => console.log('Processar pagamento')}
                className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                <CreditCard className="w-4 h-4" /> Processar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Novo Beneficiário</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                  <UserX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome Completo *</label>
                  <input 
                    required
                    value={newUser.nome}
                    onChange={e => setNewUser({...newUser, nome: e.target.value})}
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">CPF *</label>
                    <input 
                      required
                      value={newUser.cpf}
                      onChange={e => setNewUser({...newUser, cpf: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Telefone</label>
                    <input 
                      value={newUser.telefone}
                      onChange={e => setNewUser({...newUser, telefone: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">E-mail</label>
                  <input 
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Empresa *</label>
                  <select
                    required
                    value={newUser.empresa}
                    onChange={e => setNewUser({...newUser, empresa: e.target.value})}
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all"
                >
                  Cadastrar Beneficiário
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Editar Beneficiário</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome Completo *</label>
                  <input 
                    required
                    value={editingUser.nome}
                    onChange={e => setEditingUser({...editingUser, nome: e.target.value})}
                    className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">CPF *</label>
                    <input 
                      required
                      value={editingUser.cpf}
                      onChange={e => setEditingUser({...editingUser, cpf: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Telefone</label>
                    <input 
                      value={editingUser.telefone || ""}
                      onChange={e => setEditingUser({...editingUser, telefone: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">E-mail</label>
                    <input 
                      type="email"
                      value={editingUser.email || ""}
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Data de Nascimento</label>
                    <input 
                      value={editingUser.data_nascimento || ""}
                      onChange={e => setEditingUser({...editingUser, data_nascimento: e.target.value})}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Matrícula</label>
                    <input 
                      value={editingUser.matricula || ""}
                      onChange={e => setEditingUser({...editingUser, matricula: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Empresa *</label>
                    <select
                      required
                      value={editingUser.empresa}
                      onChange={e => setEditingUser({...editingUser, empresa: e.target.value})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    >
                      <option value="">Selecione uma empresa</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nível de Acesso</label>
                    <select
                      value={editingUser.role || 'user'}
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as 'admin' | 'user'})}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddPartnerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Novo Parceiro</h3>
                <button onClick={() => setShowAddPartnerModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddPartner} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome do Parceiro *</label>
                  <input 
                    required
                    value={newPartner.nome}
                    onChange={e => setNewPartner({...newPartner, nome: e.target.value})}
                    placeholder="Ex: Clínica Bem Estar"
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Categoria *</label>
                  <input 
                    required
                    value={newPartner.categoria}
                    onChange={e => setNewPartner({...newPartner, categoria: e.target.value})}
                    placeholder="Ex: Saúde, Lazer, Educação"
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Link WhatsApp *</label>
                  <input 
                    required
                    value={newPartner.link_whatsapp}
                    onChange={e => setNewPartner({...newPartner, link_whatsapp: e.target.value})}
                    placeholder="https://wa.me/..."
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Endereço *</label>
                  <input 
                    required
                    value={newPartner.endereco}
                    onChange={e => setNewPartner({...newPartner, endereco: e.target.value})}
                    placeholder="Rua Exemplo, 123 - Centro"
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Tipo *</label>
                    <select
                      required
                      value={newPartner.tipo}
                      onChange={e => setNewPartner({...newPartner, tipo: e.target.value as 'propria' | 'credenciada'})}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    >
                      <option value="propria">Rede Própria</option>
                      <option value="credenciada">Rede Credenciada</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Especialidade (se Consulta) *</label>
                    <select
                      value={newPartner.especialidade || ''}
                      onChange={e => setNewPartner({...newPartner, especialidade: e.target.value})}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    >
                      <option value="">Selecione...</option>
                      {config.especialidades.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Tipo de Exame (se Exame)</label>
                  <input 
                    value={newPartner.tipo_exame || ''}
                    onChange={e => setNewPartner({...newPartner, tipo_exame: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="Ex: Raio-X, Ultrassom..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Serviços Oferecidos *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={newPartner.servicos?.includes('consulta')}
                        onChange={e => {
                          const servicos = newPartner.servicos || [];
                          setNewPartner({...newPartner, servicos: e.target.checked ? [...servicos, 'consulta'] : servicos.filter(s => s !== 'consulta')});
                        }}
                      />
                      Consulta
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={newPartner.servicos?.includes('exame')}
                        onChange={e => {
                          const servicos = newPartner.servicos || [];
                          setNewPartner({...newPartner, servicos: e.target.checked ? [...servicos, 'exame'] : servicos.filter(s => s !== 'exame')});
                        }}
                      />
                      Exame
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">URL da Logo (Opcional)</label>
                  <input 
                    value={newPartner.foto_url}
                    onChange={e => setNewPartner({...newPartner, foto_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all"
                >
                  Adicionar Parceiro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Company Modal */}
      <AnimatePresence>
        {showAddCompanyModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Nova Empresa</h3>
                <button onClick={() => setShowAddCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome da Empresa *</label>
                  <input 
                    required
                    value={newCompany.nome}
                    onChange={e => setNewCompany({ ...newCompany, nome: e.target.value })}
                    placeholder="Ex: ACME Corp"
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">CNPJ</label>
                  <input 
                    value={newCompany.cnpj}
                    onChange={e => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Telefone</label>
                    <input 
                      value={newCompany.telefone}
                      onChange={e => setNewCompany({ ...newCompany, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">E-mail</label>
                    <input 
                      type="email"
                      value={newCompany.email}
                      onChange={e => setNewCompany({ ...newCompany, email: e.target.value })}
                      placeholder="rh@empresa.com"
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all"
                >
                  Adicionar Empresa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Company Modal */}
      <AnimatePresence>
        {showEditCompanyModal && editingCompany && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Editar Empresa</h3>
                <button onClick={() => setShowEditCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome da Empresa *</label>
                  <input 
                    required
                    value={editingCompany.nome}
                    onChange={e => setEditingCompany({ ...editingCompany, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">CNPJ</label>
                  <input 
                    value={editingCompany.cnpj || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, cnpj: e.target.value })}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Telefone</label>
                    <input 
                      value={editingCompany.telefone || ''}
                      onChange={e => setEditingCompany({ ...editingCompany, telefone: e.target.value })}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">E-mail</label>
                    <input 
                      type="email"
                      value={editingCompany.email || ''}
                      onChange={e => setEditingCompany({ ...editingCompany, email: e.target.value })}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Partner Modal */}
      <AnimatePresence>
        {showEditPartnerModal && editingPartner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-md space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Editar Parceiro</h3>
                <button onClick={() => setShowEditPartnerModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdatePartner} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Nome do Parceiro *</label>
                  <input 
                    required
                    value={editingPartner.nome}
                    onChange={e => setEditingPartner({...editingPartner, nome: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Categoria *</label>
                  <input 
                    required
                    value={editingPartner.categoria}
                    onChange={e => setEditingPartner({...editingPartner, categoria: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Link WhatsApp *</label>
                  <input 
                    required
                    value={editingPartner.link_whatsapp}
                    onChange={e => setEditingPartner({...editingPartner, link_whatsapp: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Endereço *</label>
                  <input 
                    required
                    value={editingPartner.endereco || ''}
                    onChange={e => setEditingPartner({...editingPartner, endereco: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Tipo *</label>
                    <select
                      required
                      value={editingPartner.tipo}
                      onChange={e => setEditingPartner({...editingPartner, tipo: e.target.value as 'propria' | 'credenciada'})}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    >
                      <option value="propria">Rede Própria</option>
                      <option value="credenciada">Rede Credenciada</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Especialidade (se Consulta) *</label>
                    <select
                      value={editingPartner.especialidade || ''}
                      onChange={e => setEditingPartner({...editingPartner, especialidade: e.target.value})}
                      className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    >
                      <option value="">Selecione...</option>
                      {config.especialidades.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Tipo de Exame (se Exame)</label>
                  <input 
                    value={editingPartner.tipo_exame || ''}
                    onChange={e => setEditingPartner({...editingPartner, tipo_exame: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="Ex: Raio-X, Ultrassom..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">Serviços Oferecidos *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={editingPartner.servicos?.includes('consulta')}
                        onChange={e => {
                          const servicos = editingPartner.servicos || [];
                          setEditingPartner({...editingPartner, servicos: e.target.checked ? [...servicos, 'consulta'] : servicos.filter(s => s !== 'consulta')});
                        }}
                      />
                      Consulta
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={editingPartner.servicos?.includes('exame')}
                        onChange={e => {
                          const servicos = editingPartner.servicos || [];
                          setEditingPartner({...editingPartner, servicos: e.target.checked ? [...servicos, 'exame'] : servicos.filter(s => s !== 'exame')});
                        }}
                      />
                      Exame
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-2">URL da Logo (Opcional)</label>
                  <input 
                    value={editingPartner.foto_url || ''}
                    onChange={e => setEditingPartner({...editingPartner, foto_url: e.target.value})}
                    className="w-full bg-slate-50 border border-black/5 rounded-2xl p-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Excluir Usuário?</h3>
                <p className="text-sm text-slate-500">
                  Tem certeza que deseja excluir <strong>{userToDelete.nome}</strong>? 
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partner Delete Confirmation Modal */}
      <AnimatePresence>
        {showPartnerDeleteConfirm && partnerToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Excluir Parceiro?</h3>
                <p className="text-sm text-slate-500">
                  Tem certeza que deseja excluir o parceiro <strong>{partnerToDelete.nome}</strong>? 
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowPartnerDeleteConfirm(false);
                    setPartnerToDelete(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPartnerDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Confirmation Modal */}
      <AnimatePresence>
        {showAuthConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Autorizar Usuário?</h3>
                <p className="text-sm text-slate-500">
                  Este usuário ainda não realizou o primeiro acesso. Deseja autorizá-lo manualmente? 
                  Ele ainda precisará definir uma senha ao acessar pela primeira vez.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowAuthConfirm(false);
                    setUserToAuth(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAuth}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20"
                >
                  Autorizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspended Access Modal */}
      <AnimatePresence>
        {profile && profile.adimplente === false && (
          <div className="fixed inset-0 bg-red-600 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Acesso Suspenso</h3>
                <p className="text-sm text-slate-500">
                  Seu acesso foi suspenso devido a pendências com sua empresa. 
                  Por favor, entre em contato com o RH ou responsável da sua empresa para mais informações.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<Config>({
    especialidades: [
      'Cardiologia',
      'Dermatologia',
      'Ginecologia',
      'Ortopedia',
      'Pediatria',
      'Oftalmologia',
      'Odontologia',
      'Clínico Geral',
      'Psicologia',
      'Fisioterapia'
    ],
    exames: [
      'Hemograma',
      'Glicemia',
      'Colesterol',
      'Urina',
      'Fezes',
      'Raio-X',
      'Ultrassonografia',
      'Eletrocardiograma',
      'Ressonância',
      'Tomografia'
    ],
    categorias: [
      'Saúde',
      'Bem-estar',
      'Alimentação',
      'Esporte',
      'Lazer',
      'Educação'
    ]
  });
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [insurance, setInsurance] = useState<InsuranceInfo | null>(null);
  const [sweepstakes, setSweepstakes] = useState<Sweepstake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setParsedError = (err: any) => {
    try {
      const parsed = JSON.parse(err);
      if (parsed.error && parsed.error.toLowerCase().includes('insufficient permissions')) {
        setError(`Erro de permissão no Firestore: ${parsed.operationType} em ${parsed.path}. Por favor, verifique as regras de segurança.`);
      } else {
        setError(parsed.error || err);
      }
    } catch (e) {
      setError(err);
    }
  };

  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [preRegs, setPreRegs] = useState<(UserProfile & { id: string })[]>([]);
  const [companies, setCompanies] = useState<(Company & { id: string })[]>([]);
  const [partners, setPartners] = useState<(Partner & { id: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNetwork, setSearchNetwork] = useState<'propria' | 'credenciada'>('propria');
  const [searchSpecialty, setSearchSpecialty] = useState<string>('');
  const [searchServico, setSearchServico] = useState<'consulta' | 'exame' | ''>('');
  const [companyStatus, setCompanyStatus] = useState<boolean>(true);
  const [usageFilter, setUsageFilter] = useState<string>('todos');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
            setError(null);
          } else if (firebaseUser.email === "igrejabatista.mutondo@gmail.com") {
            const adminProfile: UserProfile = {
              nome: firebaseUser.displayName || "Admin",
              email: firebaseUser.email || "",
              matricula: "ADMIN-001",
              empresa: "Bem da Gente",
              foto_url: firebaseUser.photoURL || null,
              status: 'ativo',
              role: 'admin',
              cpf: '000.000.000-00',
              senha_criada: true
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), adminProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
            setProfile(adminProfile);
          } else {
            // New user (likely Google login)
            if (isGoogleProvider && firebaseUser.email !== "igrejabatista.mutondo@gmail.com") {
              await auth.signOut();
              setError("O acesso via Google é restrito a administradores. Por favor, utilize CPF e Senha.");
              setLoading(false);
              return;
            }

            const isCpfEmail = firebaseUser.email?.endsWith('@bemdagente.com.br');
            const cpfFromEmail = isCpfEmail ? firebaseUser.email?.split('@')[0] : '';
            const formattedCpf = isCpfEmail ? cpfFromEmail?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '';

            const newProfile: UserProfile = {
              nome: firebaseUser.displayName || "Novo Usuário",
              email: firebaseUser.email || "",
              matricula: generateMatricula(),
              empresa: "Pendente",
              foto_url: firebaseUser.photoURL || null,
              status: 'ativo',
              role: 'user',
              cpf: formattedCpf || '',
              senha_criada: isCpfEmail ? true : false
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
            setProfile(newProfile);
            setError(null);
          }
        } catch (err: any) {
          console.error("Error fetching profile:", err);
          try {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    }, (err) => {
      console.error("Erro ao escutar perfil:", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && profile) {
      const unsubs: (() => void)[] = [];

      // Usage History listener
      unsubs.push(onSnapshot(
        query(collection(db, 'users', user.uid, 'historico_uso'), orderBy('data', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UsageHistory[];
          setUsageHistory(data);
          if (data.length === 0 && profile.role === 'admin') seedInitialUsageHistory(user.uid);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}/historico_uso`);
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      ));

      // Insurance listener
      unsubs.push(onSnapshot(
        collection(db, 'users', user.uid, 'seguro'),
        (snapshot) => {
          if (!snapshot.empty) {
            setInsurance({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InsuranceInfo);
          } else if (profile.role === 'admin') {
            seedInitialInsurance(user.uid);
          }
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}/seguro`);
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      ));

      // Sweepstakes listener
      unsubs.push(onSnapshot(
        query(collection(db, 'sorteios'), orderBy('data_sorteio', 'desc')),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sweepstake[];
          setSweepstakes(data);
          if (data.length === 0 && profile.role === 'admin') seedInitialSweepstakes();
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, 'sorteios');
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      ));

      // Config listener
      unsubs.push(onSnapshot(
        doc(db, 'config', 'main'),
        (docSnap) => {
          if (docSnap.exists()) {
            setConfig(docSnap.data() as Config);
          } else if (profile.role === 'admin') {
            // Initialize config if it doesn't exist
            setDoc(doc(db, 'config', 'main'), config).catch(err => {
              console.error("Erro ao inicializar config:", err);
            });
          }
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, 'config/main');
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      ));

      // Partners listener (Everyone can see)
      unsubs.push(onSnapshot(
        collection(db, 'parceiros'),
        (snapshot) => {
          setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Partner & { id: string })[]);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, 'parceiros');
          } catch (jsonErr: any) {
            setParsedError(jsonErr.message);
          }
        }
      ));

      // Admin only listeners
      if (profile.role === 'admin') {
        // Users listener
        unsubs.push(onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (UserProfile & { id: string })[]);
            setLoading(false);
          },
          (err) => {
            try {
              handleFirestoreError(err, OperationType.GET, 'users');
            } catch (jsonErr: any) {
              setParsedError(jsonErr.message);
            }
          }
        ));

        // Pre-registrations listener
        unsubs.push(onSnapshot(
          collection(db, 'pre_registrations'),
          (snapshot) => {
            setPreRegs(snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(), 
              status: doc.data().status || 'pendente', 
              senha_criada: false 
            })) as (UserProfile & { id: string })[]);
          },
          (err) => {
            try {
              handleFirestoreError(err, OperationType.GET, 'pre_registrations');
            } catch (jsonErr: any) {
              setParsedError(jsonErr.message);
            }
          }
        ));

        // Companies listener
        unsubs.push(onSnapshot(
          collection(db, 'empresas'),
          (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Company & { id: string })[]);
          },
          (err) => {
            try {
              handleFirestoreError(err, OperationType.GET, 'empresas');
            } catch (jsonErr: any) {
              setParsedError(jsonErr.message);
            }
          }
        ));
      }

      return () => unsubs.forEach(unsub => unsub());
    }
  }, [user, profile, setError]);

  useEffect(() => {
    if (profile && companies.length > 0) {
      const userCompany = companies.find(c => c.nome === profile.empresa);
      if (userCompany) {
        setCompanyStatus(userCompany.adimplente);
      } else {
        setCompanyStatus(true);
      }
    }
  }, [profile, companies]);

  const seedInitialUsageHistory = async (uid: string) => {
    const initialUsage = [
      { tipo: 'consulta', titulo: 'Consulta Cardiologia', descricao: 'Dr. Roberto Santos - Clínica Saúde Total', data: new Date(Date.now() - 86400000 * 2).toISOString(), valor_original: 150, valor_pago: 40 },
      { tipo: 'telemedicina', titulo: 'Teleatendimento Urgência', descricao: 'Dr. Marcos Lima - Plantão 24h', data: new Date(Date.now() - 86400000 * 5).toISOString(), valor_original: 120, valor_pago: 0 },
      { tipo: 'desconto', titulo: 'Farmácia Popular', descricao: 'Antibiótico e Analgésico', data: new Date(Date.now() - 86400000 * 10).toISOString(), valor_original: 100, valor_pago: 60 }
    ];
    for (const u of initialUsage) {
      try {
        await addDoc(collection(db, 'users', uid, 'historico_uso'), u);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/historico_uso`);
      }
    }
  };

  const seedInitialInsurance = async (uid: string) => {
    const initialInsurance = {
      plano: 'Auxílio Funeral Individual Plus',
      cobertura: 50000.00,
      status: 'ativo',
      data_inicio: new Date().toISOString(),
      beneficiarios: ['Cônjuge', 'Filhos']
    };
    try {
      await addDoc(collection(db, 'users', uid, 'seguro'), initialInsurance);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/seguro`);
    }
  };

  const seedInitialSweepstakes = async () => {
    const initialSweepstakes = [
      { mes: 'Março', ano: 2026, premio: 'Vale Compras R$ 500,00', status: 'agendado', data_sorteio: new Date('2026-03-31').toISOString() },
      { mes: 'Fevereiro', ano: 2026, premio: 'Smart TV 50"', status: 'realizado', data_sorteio: new Date('2026-02-28').toISOString(), ganhador_nome: 'Maria Oliveira', ganhador_matricula: 'CB-123456' }
    ];
    for (const s of initialSweepstakes) {
      try {
        await addDoc(collection(db, 'sorteios'), s);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'sorteios');
      }
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try { 
      await loginWithGoogle(); 
    } catch (err: any) { 
      console.error("Google login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("O login via Google não está habilitado no Firebase Console. Por favor, habilite-o em Authentication > Sign-in method.");
      } else {
        setError("Falha no login via Google. Tente novamente."); 
      }
      setLoading(false); 
    }
  };

  const handleLoginWithCPF = async (cpf: string, pass: string) => {
    setLoading(true);
    setError(null);
    try { 
      await loginWithCPF(cpf, pass); 
    } catch (err: any) { 
      console.error("Login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("O método de login por CPF (E-mail/Senha) não está habilitado no Firebase Console. Por favor, habilite-o em Authentication > Sign-in method.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        // Check if they are pre-registered but haven't created a password yet
        try {
          const preReg = await checkPreRegistration(cpf);
          if (preReg) {
            setError("CPF ou senha incorretos. Se este é seu primeiro acesso, clique em 'Primeiro acesso' abaixo para criar sua senha.");
          } else {
            setError("CPF ou senha incorretos. Verifique seus dados.");
          }
        } catch (checkErr) {
          setError("CPF ou senha incorretos.");
        }
      } else {
        setError("Erro ao realizar login. Tente novamente mais tarde.");
      }
      setLoading(false); 
    }
  };

  const handleFirstAccess = async (cpf: string, pass: string, data: any, phone: string, email: string, birthDate: string) => {
    setLoading(true);
    setError(null);
    try {
      await registerWithCPF(cpf, pass, data, phone, email, birthDate);
      setSuccess("Conta habilitada com sucesso! Agora você pode acessar seus benefícios.");
      setLoading(false);
    } catch (err: any) {
      console.error("First access error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("O cadastro de novos usuários não está habilitado no Firebase Console. Por favor, habilite o provedor 'E-mail/Senha' em Authentication > Sign-in method.");
      } else {
        setParsedError(err.message);
      }
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorDisplay message={error} onRetry={() => setError(null)} />;
  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full -mr-20 -mt-20" />
        <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-xl shadow-black/5 relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Sucesso!</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all active:scale-95"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage 
      onLogin={handleLogin} 
      onLoginWithCPF={handleLoginWithCPF}
      onFirstAccess={handleFirstAccess}
    />;
  }

  if (profile && profile.status === 'bloqueado') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-red-500/5 blur-[120px] rounded-full -mr-20 -mt-20" />
        <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-xl shadow-black/5 relative z-10">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Acesso Bloqueado</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">Seu acesso ao aplicativo foi bloqueado. Por favor, entre em contato com o suporte para mais informações.</p>
          <button 
            onClick={() => logout()}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all active:scale-95"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (profile && (profile.adimplente === false || companyStatus === false) && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-orange-500/5 blur-[120px] rounded-full -mr-20 -mt-20" />
        <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-xl shadow-black/5 relative z-10">
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Acesso Bloqueado</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            {companyStatus === false 
              ? `Identificamos uma pendência financeira na empresa ${profile.empresa}. Por favor, procure o setor responsável da sua empresa para mais informações.`
              : "Identificamos uma pendência financeira em sua conta. Por favor, entre em contato com o suporte para mais informações."}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.open('https://wa.me/5521995247838?text=Olá,%20gostaria%20de%20informações%20sobre%20meu%20pagamento', '_blank')}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" /> Falar com Suporte
            </button>
            <button 
              onClick={() => logout()}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all active:scale-95"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface text-slate-900 pb-24 font-sans selection:bg-primary/30">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur-xl z-30 border-b border-black/5">
        <div className="flex items-center gap-3">
          <div className="w-40 h-14 relative">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0141108959.firebasestorage.app/o/Ativo%201%404x.png?alt=media&token=5bcf2af6-8ece-429d-9adc-90888333398d" 
              alt="Logo" 
              className="w-full h-full object-contain object-left"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell setError={setError} />
          {profile?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors relative group"
              title="Painel Admin"
            >
              <Settings className="w-5 h-5 text-slate-600" />
              <span className="absolute -bottom-8 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Admin</span>
            </button>
          )}
          <button onClick={() => logout()} className="p-2 hover:bg-black/5 rounded-full transition-colors"><LogOut className="w-5 h-5 text-slate-400" /></button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}>
            <Routes location={location}>
            <Route path="/" element={
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-600 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity rounded-[2rem]" />
                <div className="relative bg-gradient-to-br from-primary to-primary-dark border border-white/20 p-6 rounded-[2rem] shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-1">Carteirinha Digital</p>
                      <h3 className="text-2xl font-bold text-white">{profile?.nome}</h3>
                    </div>
                    <div className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/30">VÁLIDO</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Empresa</p><p className="text-white font-medium">{profile?.empresa}</p></div>
                    <div><p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Matrícula</p><p className="text-white font-mono">{profile?.matricula}</p></div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate('/perfil')}
                        className="w-8 h-8 rounded-full bg-white/20 border border-white/10 overflow-hidden hover:scale-110 transition-transform"
                      >
                        {profile?.foto_url ? <img src={profile.foto_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">{profile?.nome.charAt(0)}</div>}
                      </button>
                      <span className="text-xs text-white/70">Beneficiário Ativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-white/40" />
                      <Leaf className="w-3 h-3 text-white/40" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-black/5 shadow-sm">
                  <button 
                    onClick={() => setSearchNetwork('propria')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchNetwork === 'propria' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Rede Própria
                  </button>
                  <button 
                    onClick={() => setSearchNetwork('credenciada')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchNetwork === 'credenciada' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Rede Credenciada
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSearchServico('consulta')}
                    className={`p-4 rounded-2xl font-bold text-sm transition-all ${searchServico === 'consulta' ? 'bg-primary text-white' : 'bg-white border border-black/5 text-slate-700'}`}
                  >
                    Consulta
                  </button>
                  <button 
                    onClick={() => setSearchServico('exame')}
                    className={`p-4 rounded-2xl font-bold text-sm transition-all ${searchServico === 'exame' ? 'bg-primary text-white' : 'bg-white border border-black/5 text-slate-700'}`}
                  >
                    Exame
                  </button>
                </div>

                {searchServico && (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select
                      value={searchSpecialty}
                      onChange={(e) => setSearchSpecialty(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary/50 transition-all shadow-sm appearance-none"
                    >
                      <option value="">Selecione uma especialidade...</option>
                      {config.especialidades.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                )}

                {searchSpecialty && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultados Encontrados</h4>
                      <button onClick={() => setSearchSpecialty('')} className="text-[10px] font-bold text-primary hover:underline">Limpar</button>
                    </div>
                    {partners
                      .filter(p => p.tipo === searchNetwork && p.especialidade === searchSpecialty && p.servicos?.includes(searchServico))
                      .map(p => (
                        <div key={p.id} className="bg-white border border-black/5 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h5 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{p.nome}</h5>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {p.endereco || 'Endereço não informado'}
                              </p>
                              {p.link_whatsapp && (
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {p.link_whatsapp}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {partners.filter(p => p.tipo === searchNetwork && p.especialidade === searchSpecialty && p.servicos?.includes(searchServico)).length === 0 && (
                      <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-3xl text-center">
                        <p className="text-sm text-slate-400">Nenhuma clínica encontrada para esta especialidade nesta rede.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => window.open('https://wa.me/5521995247838?text=Olá,%20gostaria%20de%20informações%20sobre%20a%20Rede%20Credenciada', '_blank')} className="bg-white border border-black/5 p-5 rounded-3xl hover:bg-slate-50 transition-all text-left flex flex-col gap-3 group shadow-sm">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Stethoscope className="w-5 h-5 text-primary" /></div>
                  <span className="font-bold text-slate-900">Rede Credenciada</span>
                  <span className="text-[10px] text-slate-400">Clique para falar no WhatsApp</span>
                </button>
                <button onClick={() => window.open('https://bemdagente.com.br/rede-propria', '_blank')} className="bg-white border border-black/5 p-5 rounded-3xl hover:bg-slate-50 transition-all text-left flex flex-col gap-3 group shadow-sm">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Building2 className="w-5 h-5 text-primary" /></div>
                  <span className="font-bold text-slate-900">Rede Própria</span>
                  <span className="text-[10px] text-slate-400">Acesse nossa rede exclusiva</span>
                </button>
                <button onClick={() => navigate('/telemed')} className="bg-white border border-black/5 p-5 rounded-3xl hover:bg-slate-50 transition-all text-left flex flex-col gap-3 group shadow-sm col-span-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Video className="w-5 h-5 text-primary" /></div>
                  <span className="font-bold text-slate-900">Tele Medicina</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group opacity-60 grayscale cursor-not-allowed">
                  <div className="bg-white border border-black/5 p-4 rounded-3xl text-left flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Heart className="w-5 h-5 text-slate-400" /></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm">Auxílio Funeral</span>
                      <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Em Breve</span>
                    </div>
                  </div>
                </div>
                <div className="relative group opacity-60 grayscale cursor-not-allowed">
                  <div className="bg-white border border-black/5 p-4 rounded-3xl text-left flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-slate-400" /></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm">Sorteios</span>
                      <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Em Breve</span>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          } />

          <Route path="/usage-history" element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6 rotate-180 text-slate-600" /></button>
                <h2 className="text-2xl font-bold text-slate-900">Histórico de Uso</h2>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['todos', 'consulta', 'telemedicina', 'exame', 'desconto'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setUsageFilter(f)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                      usageFilter === f 
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                        : 'bg-white text-slate-500 border-black/5 hover:border-black/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div className="bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="divide-y divide-black/5">
                  {usageHistory
                    .filter(item => usageFilter === 'todos' || item.tipo === usageFilter)
                    .map((item) => (
                    <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          item.tipo === 'consulta' ? 'bg-primary/10 text-primary' :
                          item.tipo === 'telemedicina' ? 'bg-primary/10 text-primary' :
                          item.tipo === 'desconto' ? 'bg-primary/10 text-primary' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {item.tipo === 'consulta' ? <Stethoscope className="w-6 h-6" /> :
                           item.tipo === 'telemedicina' ? <Video className="w-6 h-6" /> :
                           item.tipo === 'desconto' ? <Pill className="w-6 h-6" /> :
                           <Activity className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.descricao}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            {new Date(item.data?.seconds ? item.data.seconds * 1000 : item.data).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.valor_pago !== undefined && (
                          <p className="text-slate-900 font-bold text-xs mt-1">Pago R$ {item.valor_pago.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {usageHistory.filter(item => usageFilter === 'todos' || item.tipo === usageFilter).length === 0 && (
                    <div className="p-12 text-center text-slate-400">Nenhum registro de {usageFilter === 'todos' ? 'uso' : usageFilter} encontrado.</div>
                  )}
                </div>
              </div>
            </motion.div>
          } />

          <Route path="/insurance" element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6 rotate-180 text-slate-600" /></button>
                <h2 className="text-2xl font-bold text-slate-900">Auxílio Funeral</h2>
              </div>
              
              {insurance ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary to-primary-dark p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <Shield className="w-12 h-12 text-white/30 absolute bottom-6 right-6" />
                    <div className="space-y-4 relative z-10">
                      <div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Status da Apólice</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-white font-bold uppercase text-xs">{insurance.status}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">{insurance.plano}</h3>
                        <p className="text-white/80 text-sm">Cobertura de R$ {insurance.cobertura?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-black/5 p-6 rounded-3xl space-y-6 shadow-sm">
                    <div>
                      <h4 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Beneficiários Designados
                      </h4>
                      <div className="space-y-3">
                        {insurance.beneficiarios?.map((b: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-black/5">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            <span className="text-sm text-slate-700">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-6 border-t border-black/5">
                      <p className="text-slate-400 text-xs">Início da vigência: {new Date(insurance.data_inicio?.seconds ? insurance.data_inicio.seconds * 1000 : insurance.data_inicio).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-white border border-black/5 rounded-[2rem] shadow-sm">
                  Carregando informações do seguro...
                </div>
              )}
            </motion.div>
          } />

          <Route path="/sweepstakes" element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6 rotate-180 text-slate-600" /></button>
                <h2 className="text-2xl font-bold text-slate-900">Sorteios Mensais</h2>
              </div>
              
              <div className="space-y-4">
                {sweepstakes.map((s) => (
                  <div key={s.id} className={`p-6 rounded-[2rem] border transition-all ${
                    s.status === 'realizado' ? 'bg-white border-black/5 opacity-80' : 'bg-gradient-to-br from-primary/5 to-primary-dark/5 border-primary/20 shadow-xl shadow-primary/5'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${s.status === 'realizado' ? 'text-slate-400' : 'text-primary'}`}>
                          Sorteio de {s.mes} {s.ano}
                        </p>
                        <h3 className="text-xl font-bold text-slate-900">{s.premio}</h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        s.status === 'realizado' ? 'bg-slate-100 text-slate-500 border-black/5' : 'bg-primary/10 text-primary border-primary/30'
                      }`}>
                        {s.status.toUpperCase()}
                      </div>
                    </div>
                    
                    {s.status === 'realizado' ? (
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                        <p className="text-xs text-slate-400">Ganhador(a):</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-slate-900 font-bold text-sm">{s.ganhador_nome}</p>
                            <p className="text-slate-400 text-[10px]">{s.ganhador_matricula}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-4 h-4 text-primary" />
                        Próximo sorteio em: {new Date(s.data_sorteio?.seconds ? s.data_sorteio.seconds * 1000 : s.data_sorteio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          } />

          <Route path="/chat" element={<SupportChat profile={profile} setError={setError} />} />
          <Route path="/notificacoes" element={<NotificationCenter setError={setError} />} />
          <Route path="/admin" element={
            !auth.currentUser ? <AdminLoginPage onLogin={loginWithGoogle} /> : (
              profile?.role === 'admin' ? (
                <AdminDashboard 
                  setError={setError} 
                  setParsedError={setParsedError}
                  setSuccess={setSuccess} 
                  users={users}
                  preRegs={preRegs}
                  loading={loading}
                  setLoading={setLoading}
                  companies={companies}
                  partners={partners}
                  profile={profile}
                  config={config}
                  setConfig={setConfig}
                />
              ) : (
                <ErrorDisplay message="Você não tem permissão para acessar esta área." />
              )
            )
          } />
          <Route path="/admin/chats" element={profile?.role === 'admin' ? <AdminChatList setError={setError} /> : <ErrorDisplay message="Você não tem permissão para acessar esta área." />} />
          <Route path="/admin/chats/:id" element={profile?.role === 'admin' ? <AdminChatRoom setError={setError} /> : <ErrorDisplay message="Você não tem permissão para acessar esta área." />} />
          <Route path="/perfil" element={<ProfilePage profile={profile} setProfile={setProfile} setError={setError} setSuccess={setSuccess} />} />

          <Route path="/telemed" element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronRight className="w-6 h-6 rotate-180 text-slate-600" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900">Teleatendimento</h2>
              </div>

              {/* Hero Section */}
              <div className="bg-gradient-to-br from-primary to-primary-dark p-8 rounded-[2.5rem] text-center space-y-6 shadow-2xl shadow-primary/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-[80px] -mr-10 -mt-10 animate-pulse" />
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Video className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white tracking-tight">Médico Online 24h</h3>
                  <p className="text-white/80 text-sm max-w-xs mx-auto">Atendimento imediato para urgências leves, sem sair de casa e sem custo adicional.</p>
                </div>
                <button 
                  onClick={() => window.open('https://meet.google.com/new', '_blank')}
                  className="w-full bg-white text-primary font-black py-5 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-xl group/btn"
                >
                  Iniciar Consulta Agora 
                  <Zap className="w-5 h-5 fill-primary text-primary group-hover/btn:scale-125 transition-transform" />
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Tempo de espera: ~12 min
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Shield className="w-5 h-5" />, title: "100% Seguro", desc: "Dados criptografados" },
                  { icon: <FileText className="w-5 h-5" />, title: "Receita Digital", desc: "Válida em todo Brasil" },
                  { icon: <Clock className="w-5 h-5" />, title: "Sem Carência", desc: "Uso imediato" },
                  { icon: <Activity className="w-5 h-5" />, title: "Histórico", desc: "Tudo registrado" }
                ].map((b, i) => (
                  <div key={i} className="bg-white border border-black/5 p-5 rounded-3xl space-y-2 shadow-sm">
                    <div className="text-primary">{b.icon}</div>
                    <div>
                      <p className="text-slate-900 font-bold text-sm">{b.title}</p>
                      <p className="text-slate-400 text-[10px]">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Symptoms Section */}
              <div className="bg-white border border-black/5 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-bold text-slate-900">Quando usar?</h4>
                </div>
                <p className="text-sm text-slate-500">O teleatendimento é ideal para sintomas leves e orientações médicas:</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    "Gripes, resfriados e tosses",
                    "Dores de garganta e ouvido",
                    "Alergias e irritações na pele",
                    "Dores de cabeça e enxaquecas",
                    "Náuseas e desconforto abdominal",
                    "Renovação de receitas de uso contínuo"
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-black/5">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-slate-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 px-2">Passo a passo</h4>
                <div className="space-y-3">
                  {[
                    { t: "Solicitação", d: "Clique no botão de início e confirme seus dados." },
                    { t: "Triagem", d: "Passe por uma breve triagem com nossa equipe de enfermagem." },
                    { t: "Consulta", d: "Converse com o médico por vídeo ou áudio." },
                    { t: "Pós-consulta", d: "Receba receitas e atestados diretamente no seu WhatsApp." }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-white border border-black/5 rounded-3xl shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold text-sm">{step.t}</p>
                        <p className="text-slate-500 text-xs mt-1">{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
    </main>
    </div>
    </ErrorBoundary>
  );
}
