import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import HistorialPage from '../../pages/HistorialPage';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import PerfilPage from '../../pages/PerfilPage';
import RegisterPage from '../../pages/RegisterPage';

const AppRouter = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="perfil" element={<PerfilPage />} />
                <Route path="historial" element={<HistorialPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
);

export default AppRouter;
