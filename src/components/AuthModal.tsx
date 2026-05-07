/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, MapPin, CreditCard, ChevronRight, CheckCircle2, AlertCircle, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAddressByCEP } from '../services/locationService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, loginWithEmail, register } = useAuth();
  const [mode, setMode] = useState<'selection' | 'login' | 'register'>('selection');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    socialName: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    number: '',
    complement: '',
    cep: '',
    cpf: ''
  });

  const handleSearchCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    
    setLoadingCEP(true);
    try {
      const address = await fetchAddressByCEP(cep);
      if (address) {
        setFormData(prev => ({
          ...prev,
          state: address.state,
          city: address.city,
          neighborhood: address.neighborhood,
          street: address.street
        }));
      }
    } catch (error) {
      console.error("CEP fetch error", error);
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleModeChange = (newMode: 'selection' | 'login' | 'register') => {
    setMode(newMode);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(formData.email, formData.password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { password, confirmPassword, ...profileData } = formData;
      await register(formData.email, formData.password, profileData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMode('selection');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
      onClose();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      // Specific handling for common errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes de completar.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela de login. Por favor, desabilite o bloqueador de popups.');
      } else {
        setError('Não foi possível entrar com Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-neutral-900/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 transition-colors z-10"
              >
                <X size={24} />
              </button>

            <div className="p-8">
              {success ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Quase lá!</h2>
                  <p className="text-neutral-600">
                    Enviamos um e-mail de validação para <strong>{formData.email}</strong>. 
                    Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta e retornar ao app.
                  </p>
                  <div className="mt-8 text-xs text-neutral-400 font-medium animate-pulse">
                    Esta janela fechará automaticamente em alguns segundos...
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-neutral-900">
                      {mode === 'selection' ? 'Bem-vindo' : mode === 'login' ? 'Entrar' : 'Novo Cadastro'}
                    </h2>
                    <p className="text-neutral-500">
                      {mode === 'selection' && 'Escolha como deseja continuar'}
                      {mode === 'login' && 'Acesse sua conta para continuar'}
                      {mode === 'register' && 'Preencha os dados obrigatórios abaixo'}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium">
                      <AlertCircle size={18} />
                      {error}
                    </div>
                  )}

                  {mode === 'selection' && (
                    <div className="space-y-4">
                      <button 
                        onClick={() => handleModeChange('login')}
                        className="w-full p-4 flex items-center justify-between rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-neutral-600 shadow-sm">
                            <Lock size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-neutral-900">Já sou cadastrado</p>
                            <p className="text-xs text-neutral-500">Entrar com e-mail e senha</p>
                          </div>
                        </div>
                        <ChevronRight className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                      </button>

                      <button 
                        onClick={() => handleModeChange('register')}
                        className="w-full p-4 flex items-center justify-between rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <User size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-neutral-900">Sou usuário novo</p>
                            <p className="text-xs text-neutral-500">Criar uma nova conta agora</p>
                          </div>
                        </div>
                        <ChevronRight className="text-emerald-300 group-hover:text-emerald-900 transition-colors" />
                      </button>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-neutral-100"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-neutral-400">Ou</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleGoogleLogin}
                        className="w-full p-4 flex items-center justify-center gap-3 rounded-2xl border border-neutral-200 hover:bg-neutral-50 transition-all font-bold"
                      >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Continuar com Google
                      </button>
                    </div>
                  )}

                  {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase ml-1">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                          <input 
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            placeholder="seu@email.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase ml-1">Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                          <input 
                            type="password"
                            required
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <button 
                        disabled={loading}
                        type="submit"
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {loading ? 'Entrando...' : 'Entrar'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleModeChange('selection')}
                        className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Voltar
                      </button>
                    </form>
                  )}

                  {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-6 px-1">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1 flex items-center justify-between">
                            <span>CEP*</span>
                            {loadingCEP && <Loader2 size={12} className="animate-spin text-emerald-600" />}
                          </label>
                          <div className="flex gap-2">
                            <input 
                              required
                              placeholder="00000-000"
                              value={formData.cep}
                              onChange={e => setFormData({...formData, cep: e.target.value})}
                              onBlur={handleSearchCEP}
                              className="flex-1 px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <button 
                              type="button"
                              onClick={handleSearchCEP}
                              className="p-3 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                            >
                              <Search size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Estado*</label>
                            <input 
                              required
                              value={formData.state}
                              readOnly
                              className="w-full px-4 py-3 rounded-xl bg-neutral-100 border border-neutral-100 outline-none opacity-70"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Cidade*</label>
                            <input 
                              required
                              value={formData.city}
                              readOnly
                              className="w-full px-4 py-3 rounded-xl bg-neutral-100 border border-neutral-100 outline-none opacity-70"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Bairro*</label>
                            <input 
                              required
                              value={formData.neighborhood}
                              onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Logradouro*</label>
                            <input 
                              required
                              value={formData.street}
                              onChange={e => setFormData({...formData, street: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2 col-span-1">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Número*</label>
                            <input 
                              required
                              value={formData.number}
                              onChange={e => setFormData({...formData, number: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Complemento</label>
                            <input 
                              value={formData.complement}
                              onChange={e => setFormData({...formData, complement: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Nome*</label>
                          <input 
                            required
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Sobrenome*</label>
                          <input 
                            required
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Nome Social (Opcional)</label>
                        <input 
                          value={formData.socialName}
                          onChange={e => setFormData({...formData, socialName: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">CPF*</label>
                          <input 
                            required
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={e => setFormData({...formData, cpf: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Estado*</label>
                          <input 
                            required
                            value={formData.state}
                            onChange={e => setFormData({...formData, state: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Cidade*</label>
                          <input 
                            required
                            value={formData.city}
                            onChange={e => setFormData({...formData, city: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Bairro*</label>
                          <input 
                            required
                            value={formData.neighborhood}
                            onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">E-mail*</label>
                        <input 
                          type="email"
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Senha*</label>
                          <input 
                            type="password"
                            required
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Confirmar Senha*</label>
                          <input 
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button 
                          disabled={loading}
                          type="submit"
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                        >
                          {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    )}
    </AnimatePresence>,
    document.body
  );
}
