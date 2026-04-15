import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../features/auth';
import { useTheme } from '../features/theme';
import AuthShell from '../shared/ui/AuthShell';

const LoginPage = () => {
    const { login, googleLogin } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate('/');
                return;
            }

            setError(result.message || 'Credenciales invalidas');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesion');
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
                return;
            }

            setError(result.message || 'Error al autenticar con Google');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Error al iniciar sesion con Google');
    };

    return (
        <AuthShell
            isDarkMode={isDarkMode}
            cardTitle="Inicia sesión"
            heroSubtitle="Accede a tu campus digital y sigue construyendo tu futuro profesional"
            footer={
                <p className={`text-[13px] ${isDarkMode ? 'text-slate-300/80' : 'text-slate-600'}`}>
                    ¿No tienes una cuenta?{' '}
                    <Link to="/register" className="font-black text-[#F45A22] underline-offset-4 transition-colors hover:text-[#d94d1a] hover:underline">
                        REGISTRATE AQUI
                    </Link>
                </p>
            }
        >
            <div className="mb-4 flex flex-col gap-3">
                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme={isDarkMode ? 'filled_black' : 'outline'}
                        shape="pill"
                        text="continue_with"
                    />
                </div>

                <div className="relative flex items-center py-1">
                    <div className={`flex-grow border-t ${isDarkMode ? 'border-[#F45A22]/20' : 'border-[#D7C9BE]'}`} />
                    <span className={`mx-4 flex-shrink text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-300/65' : 'text-stone-500'}`}>
                        o correo
                    </span>
                    <div className={`flex-grow border-t ${isDarkMode ? 'border-[#F45A22]/20' : 'border-[#D7C9BE]'}`} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-300/70' : 'text-slate-500'}`}>
                        Correo electrónico
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F45A22]" size={18} />
                        <input
                            type="email"
                            required
                            className={`w-full rounded-xl border px-4 py-3 pl-12 outline-none transition-all placeholder:text-slate-400/70 ${
                                isDarkMode
                                    ? 'border-[#F45A22]/20 bg-white/5 text-slate-100 focus:border-[#F45A22]/75 focus:ring-2 focus:ring-[#F45A22]/25'
                                    : 'border-[#D8CBC1] bg-white/80 text-slate-900 focus:border-[#F45A22]/70 focus:ring-2 focus:ring-[#F45A22]/20'
                            }`}
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            name="email"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-300/70' : 'text-slate-500'}`}>
                        Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F45A22]" size={18} />
                        <input
                            type="password"
                            required
                            className={`w-full rounded-xl border px-4 py-3 pl-12 outline-none transition-all placeholder:text-slate-400/70 ${
                                isDarkMode
                                    ? 'border-[#F45A22]/20 bg-white/5 text-slate-100 focus:border-[#F45A22]/75 focus:ring-2 focus:ring-[#F45A22]/25'
                                    : 'border-[#D8CBC1] bg-white/80 text-slate-900 focus:border-[#F45A22]/70 focus:ring-2 focus:ring-[#F45A22]/20'
                            }`}
                            placeholder="********"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            name="password"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-sm font-bold text-red-500">
                        {error}
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F45A22] via-[#F45A22] to-[#ff7a45] px-6 py-3 font-bold text-white shadow-[0_14px_35px_rgba(244,90,34,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(244,90,34,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <span>INICIAR SESIÓN</span>
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
