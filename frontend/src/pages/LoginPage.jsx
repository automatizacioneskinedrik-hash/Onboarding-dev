import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../features/auth';
import { useTheme } from '../features/theme';
import ConstellationBackground from '../shared/ui/ConstellationBackground';

const LoginPage = () => {
    const { login, googleLogin } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await login(email, password);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.message || 'Credenciales inválidas');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            const result = await googleLogin(credentialResponse.credential);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.message || 'Error al autenticar con Google');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Error al iniciar sesión con Google');
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDarkMode ? 'bg-[#12100E]' : 'bg-[#F8F9FA]'}`}>
            <ConstellationBackground theme={isDarkMode ? 'dark' : 'light'} />

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-accent/10 mb-4">
                        <svg viewBox="0 0 100 100" className="w-10 h-10">
                            <polygon points="50,20 15,80 85,80" fill="none" stroke="#FF6B35" strokeWidth="10" />
                            <rect x="42" y="4" width="7" height="7" fill="#FF6B35" />
                            <rect x="52" y="4" width="7" height="7" fill="#FF6B35" />
                        </svg>
                    </div>
                    <h1 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        LÄR <span className="text-orange-accent">UNIVERSITY</span>
                    </h1>
                    <p className={`text-sm font-medium mt-2 ${isDarkMode ? 'text-stone-400' : 'text-slate-500'}`}>
                        TU TERCERA VÍA HACIA LA ÉLITE PROFESIONAL
                    </p>
                </div>

                <div className={`card ${isDarkMode ? 'bg-[#1C1917]/80 border-[#2E2925]' : 'bg-white border-[#E2E8F0]'} backdrop-blur-xl shadow-2xl p-8 rounded-3xl`}>
                    <h2 className={`text-xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>Bienvenido de nuevo</h2>

                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme={isDarkMode ? "filled_black" : "outline"}
                                shape="pill"
                                text="continue_with"
                            />
                        </div>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-stone-800"></div>
                            <span className="flex-shrink mx-4 text-xs font-black uppercase tracking-widest text-stone-500">o correo</span>
                            <div className="flex-grow border-t border-stone-800"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="input-field pl-12"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    name="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="input-field pl-12"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    name="password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm text-center font-bold p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full group flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span>INICIAR SESIÓN</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-dashed border-stone-800 text-center">
                        <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-slate-500'}`}>
                            ¿No tienes una cuenta?{' '}
                            <Link to="/register" className="text-orange-accent font-black hover:underline underline-offset-4">
                                REGÍSTRATE AQUÍ
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
