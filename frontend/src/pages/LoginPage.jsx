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
            cardTitle="Bienvenido de nuevo"
            heroSubtitle="Tu tercera via hacia la elite profesional"
            footer={
                <p className={`text-[13px] ${isDarkMode ? 'text-stone-400' : 'text-slate-500'}`}>
                    No tienes una cuenta?{' '}
                    <Link to="/register" className="font-black text-orange-accent underline-offset-4 hover:underline">
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
                    <div className="flex-grow border-t border-stone-800" />
                    <span className="mx-4 flex-shrink text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">
                        o correo
                    </span>
                    <div className="flex-grow border-t border-stone-800" />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>
                        Correo electronico
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                        <input
                            type="email"
                            required
                            className="input-field pl-12"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            name="email"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>
                        Contrasena
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                        <input
                            type="password"
                            required
                            className="input-field pl-12"
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
                    className="btn-primary group flex w-full items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <span>INICIAR SESION</span>
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
