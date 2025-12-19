import React, { createContext, useContext, useLayoutEffect, useState } from 'react';
import type { User } from '../data/types.ts';
import AuthenticationPage from '../pages/AuthenticationPage.tsx';

interface AuthenticationContextValue {
    user?: User;
    isAuthenticated: boolean;
}

interface AuthenticationProviderProps extends React.PropsWithChildren {}

const JWT_STORAGE_KEY = 'auth_jwt';

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

const decodeJwt = (jwt: string) => JSON.parse(atob(jwt.split('.')[1]));

export const getJwt = (): string | null => {
    return window.localStorage.getItem(JWT_STORAGE_KEY);
};

export const setJwt = (jwt: string) => {
    window.localStorage.setItem(JWT_STORAGE_KEY, jwt);
};

export const removeJwt = () => {
    window.localStorage.removeItem(JWT_STORAGE_KEY);
};

export const AuthenticationProvider = ({ children }: AuthenticationProviderProps) => {
    const [user, setUser] = useState<User | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useLayoutEffect(() => {
        const jwt = getJwt();
        if (jwt) {
            const decodedJwt = decodeJwt(jwt);
            if (decodedJwt.exp * 1000 > Date.now() + 30 * 60 * 1000) {
                // if at least 30 minutes left before expiration
                handleAuthenticationSuccess(jwt);
            } else {
                removeJwt();
            }
        }
    }, []);

    const handleAuthenticationSuccess = (jwt: string) => {
        const decodedJwt: any = decodeJwt(jwt);
        setUser({
            name: decodedJwt.given_name || decodedJwt.name,
            email: decodedJwt.email,
            imageUrl: decodedJwt.picture,
        });
        setIsAuthenticated(true);
        setJwt(jwt);
    };

    return (
        <AuthenticationContext.Provider value={{ user, isAuthenticated }}>
            {!isAuthenticated ? <AuthenticationPage onAuthenticationSuccess={handleAuthenticationSuccess} /> : children}
        </AuthenticationContext.Provider>
    );
};

export function useViewer(): User | null {
    const { user } = useContext(AuthenticationContext) || {};

    return user || null;
}

export function useIsAuthenticated(): boolean {
    const { isAuthenticated } = useContext(AuthenticationContext) || {};

    return isAuthenticated!;
}
