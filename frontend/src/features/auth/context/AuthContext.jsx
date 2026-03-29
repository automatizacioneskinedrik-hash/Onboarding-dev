import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuthToken, getAuthToken, setAuthToken } from '../../../shared/lib/storage/auth-token';
import { findMasterById } from '../../../shared/utils/masters';
import {
    fetchCurrentUser,
    fetchMasters,
    googleLoginRequest,
    loginRequest,
    registerRequest,
    updateSelectedMaster,
} from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [masters, setMasters] = useState([]);
    const [loading, setLoading] = useState(true);

    // Rehidrata el usuario desde el token ya persistido sin obligar a reloguear al recargar.
    const refreshUser = async () => {
        const response = await fetchCurrentUser();

        if (response.success) {
            setUser(response.data.user);
            return response.data.user;
        }

        return null;
    };

    const loadMasters = async () => {
        const response = await fetchMasters();

        if (response.success) {
            const nextMasters = response.data.masters || [];
            setMasters(nextMasters);
            return nextMasters;
        }

        return [];
    };

    useEffect(() => {
        // El arranque valida el token actual y solo carga catalogos si la sesion sigue viva.
        const checkLogin = async () => {
            const token = getAuthToken();

            if (token) {
                try {
                    const currentUser = await refreshUser();

                    if (currentUser) {
                        await loadMasters();
                    } else {
                        clearAuthToken();
                    }
                } catch (error) {
                    console.error('Error checking auth:', error);
                    clearAuthToken();
                    setUser(null);
                    setMasters([]);
                }
            }

            setLoading(false);
        };

        checkLogin();
    }, []);

    // Centraliza login/register/google para que todas las entradas actualicen token, usuario
    // y catalogo de masters con la misma secuencia.
    const authenticate = async (request) => {
        const response = await request;

        if (response.success) {
            const { token, user: nextUser } = response.data;
            setAuthToken(token);
            setUser(nextUser);
            await loadMasters();
        }

        return response;
    };

    const login = (email, password) => authenticate(loginRequest(email, password));
    const googleLogin = (credential) => authenticate(googleLoginRequest(credential));
    const register = (payload) => authenticate(registerRequest(payload));

    const selectMaster = async (masterId) => {
        const response = await updateSelectedMaster(masterId);

        if (response.success) {
            setUser(response.data.user);
        }

        return response;
    };

    const logout = () => {
        clearAuthToken();
        setUser(null);
        setMasters([]);
    };

    // Derivamos el master seleccionado una sola vez para que la UI no tenga que resolver ids.
    const selectedMaster = useMemo(
        () => findMasterById(masters, user?.selectedMasterId),
        [masters, user?.selectedMasterId]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                masters,
                selectedMaster,
                loading,
                login,
                googleLogin,
                register,
                logout,
                refreshUser,
                loadMasters,
                selectMaster,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
