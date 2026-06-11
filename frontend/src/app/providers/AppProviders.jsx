import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../../features/auth';
import { ThemeProvider } from '../../features/theme';
import { GOOGLE_CLIENT_ID } from '../../shared/lib/config/env';

const AppProviders = ({ children }) => (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
    </GoogleOAuthProvider>
);

export default AppProviders;
