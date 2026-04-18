import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rxUser')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    user
      ? localStorage.setItem('rxUser', JSON.stringify(user))
      : localStorage.removeItem('rxUser');
  }, [user]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team')
        .select('id, username, email, role')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        setLoading(false);
        return false;
      }
      setUser({ id: data.id, username: data.username, email: data.email, role: data.role });
      setLoading(false);
      return true;
    } catch {
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
