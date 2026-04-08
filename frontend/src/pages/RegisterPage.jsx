import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../features/auth';
import { useTheme } from '../features/theme';
import AuthShell from '../shared/ui/AuthShell';

const RegisterPage = () => {
    const { register } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await register({ name, email, password });

            if (result.success) {
                navigate('/');
                return;
            }

            setError(result.message || 'No se pudo crear la cuenta');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            isDarkMode={isDarkMode}
            cardTitle="Crea tu cuenta"
            heroSubtitle="Comienza tu viaje hacia la elite"
            footer={
                <p className={`text-[13px] ${isDarkMode ? 'text-stone-400' : 'text-slate-500'}`}>
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="font-black text-orange-accent underline-offset-4 hover:underline">
                        INICIA SESIÓN
                    </Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>
                        Nombre completo
                    </label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                        <input
                            type="text"
                            required
                            className="input-field pl-12"
                            placeholder="Tu nombre"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="name"
                            name="name"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>
                        Correo electrónico
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
                        Contraseña
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
                            autoComplete="new-password"
                            name="password"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-stone-500' : 'text-slate-400'}`}>
                        Confirmar contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-accent" size={18} />
                        <input
                            type="password"
                            required
                            className="input-field pl-12"
                            placeholder="********"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            name="confirmPassword"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-sm font-bold text-red-500">
                        {error}
                    </div>
                ) : null}

                <button type="submit" disabled={loading} className="btn-primary group w-full">
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <span>CREAR CUENTA</span>
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>
            </form>
        </AuthShell>
    );
};

export default RegisterPage;
