import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // get token, if it exists
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);

    // extracts user info
    function decodeJwt(token) {
        try {
            const payload = token.split(".")[1];
            return JSON.parse(atob(payload));
        } catch {
            return null;
        }
    }

    // whenever token changes, update the user
    useEffect(() => {
        if (!token) {
            setUser(null);
            return;
        }
        setUser(decodeJwt(token));
    }, [token]);

    // stores token in React and localStorage
    function storeToken(jwt) {
        localStorage.setItem("token", jwt);
        setToken(jwt);
    }

    // clears all user data
    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ token, user, storeToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  return useContext(AuthContext);
}
