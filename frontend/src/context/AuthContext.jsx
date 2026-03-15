import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { findMasterById } from '../utils/masters';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [masters, setMasters] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const response = await api.get('/auth/me');
        if (response.data.success) {
            setUser(response.data.data.user);
            return response.data.data.user;
        }
        return null;
    };

    const loadMasters = async () => {
        const response = await api.get('/users/masters');
        if (response.data.success) {
            setMasters(response.data.data.masters || []);
            return response.data.data.masters || [];
        }
        return [];
    };

    useEffect(() => {
        const checkLogin = async () => {
            const token = localStorage.getItem('eduai_token');
            if (token) {
                try {
                    const currentUser = await refreshUser();
                    if (currentUser) {
                        await loadMasters();
                    } else {
                        localStorage.removeItem('eduai_token');
                    }
                } catch (error) {
                    console.error('Error checking auth:', error);
                    localStorage.removeItem('eduai_token');
                    setUser(null);
                    setMasters([]);
                }
            }
            setLoading(false);
        };

        checkLogin();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('eduai_token', token);
            setUser(user);
            await loadMasters();
        }
        return response.data;
    };

    const googleLogin = async (credential) => {
        const response = await api.post('/auth/google', { credential });
        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('eduai_token', token);
            setUser(user);
            await loadMasters();
        }
        return response.data;
    };

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('eduai_token', token);
            setUser(user);
            await loadMasters();
        }
        return response.data;
    };

    const selectMaster = async (masterId) => {
        const response = await api.put('/users/master', { masterId });
        if (response.data.success) {
            setUser(response.data.data.user);
        }
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('eduai_token');
        setUser(null);
        setMasters([]);
    };

    const selectedMaster = findMasterById(masters, user?.selectedMasterId);

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
