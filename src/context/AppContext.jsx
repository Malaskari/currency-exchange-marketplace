import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext();

const mapTeam = (m) => ({
  id: m.id,
  username: m.username,
  email: m.email,
  role: m.role,
  joinedAt: m.joined_at,
});

export const AppProvider = ({ children }) => {
  const { data: settings = {}, isLoading: settingsLoading } = useSettings();
  const updateSettingMutation = useUpdateSetting();

  const [team, setTeam] = useState([]);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rxUser')); } catch { return null; }
  });

  useEffect(() => {
    const loadTeam = async () => {
      const { data } = await supabase.from('team').select('*').order('joined_at', { ascending: true });
      if (data) setTeam(data.map(mapTeam));
    };
    loadTeam();
  }, []);

  useEffect(() => {
    user
      ? localStorage.setItem('rxUser', JSON.stringify(user))
      : localStorage.removeItem('rxUser');
  }, [user]);

  const login = useCallback(async (username, password) => {
    // Try 'team' table first (legacy)
    const { data: teamData, error: teamError } = await supabase
      .from('team')
      .select('id, username, email, role, password_hash')
      .eq('username', username)
      .single();

    if (teamData && !teamError) {
      // Only check password_hash (never plain-text)
      if (teamData.password_hash && teamData.password_hash === password) {
        setUser({ id: teamData.id, username: teamData.username, email: teamData.email, role: teamData.role });
        return true;
      }
    }

    // Try 'users' table (new system)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, password_hash')
      .eq('email', username) 
      .single();

    if (userData && !userError) {
      // Only accept properly hashed passwords
      if (userData.password_hash === password) {
        setUser({ id: userData.id, username: userData.name, email: userData.email, role: userData.role });
        return true;
      }
    }

    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const updateCashRate = useCallback((v) => updateSettingMutation.mutate({ key: 'cashRate', value: v }), [updateSettingMutation]);
  const updateBankRate = useCallback((v) => updateSettingMutation.mutate({ key: 'bankRate', value: v }), [updateSettingMutation]);
  const updateCashBuyRate = useCallback((v) => updateSettingMutation.mutate({ key: 'cashBuyRate', value: v }), [updateSettingMutation]);
  const updateBankBuyRate = useCallback((v) => updateSettingMutation.mutate({ key: 'bankBuyRate', value: v }), [updateSettingMutation]);
  const updateCashEnabled = useCallback((v) => updateSettingMutation.mutate({ key: 'cashEnabled', value: v }), [updateSettingMutation]);
  const updateBankEnabled = useCallback((v) => updateSettingMutation.mutate({ key: 'bankEnabled', value: v }), [updateSettingMutation]);
  const updateCashBuyEnabled = useCallback((v) => updateSettingMutation.mutate({ key: 'cashBuyEnabled', value: v }), [updateSettingMutation]);
  const updateBankBuyEnabled = useCallback((v) => updateSettingMutation.mutate({ key: 'bankBuyEnabled', value: v }), [updateSettingMutation]);
  const updateFeePercent = useCallback((v) => updateSettingMutation.mutate({ key: 'feePercent', value: v }), [updateSettingMutation]);
  const updateUsdBuyRate = useCallback((v) => updateSettingMutation.mutate({ key: 'usdBuyRate', value: v }), [updateSettingMutation]);

  const addTeamMember = useCallback(async (data) => {
    const id = 'u' + uuidv4();
    const row = {
      id,
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
      joined_at: new Date().toISOString().split('T')[0],
    };
    const { data: inserted } = await supabase.from('team').insert(row).select().single();
    if (inserted) setTeam((prev) => [...prev, mapTeam(inserted)]);
  }, []);

  const removeTeamMember = useCallback(async (id) => {
    await supabase.from('team').delete().eq('id', id);
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAllData = useCallback(async () => {
    await supabase.from('requests').delete().neq('id', '0');
    await supabase.from('sales').delete().neq('id', '0');
    await supabase.from('usdt_sales').delete().neq('id', '0');
    await supabase.from('card_purchases').delete().neq('id', '0');
    await supabase.from('account_transactions').delete().neq('id', '0');
    return true;
  }, []);

  const loading = settingsLoading;

  return (
    <AppContext.Provider value={{
      loading,
      cashRate: settings.cashRate ?? 4.85,
      bankRate: settings.bankRate ?? 4.80,
      cashBuyRate: settings.cashBuyRate ?? 4.92,
      bankBuyRate: settings.bankBuyRate ?? 4.88,
      cashEnabled: settings.cashEnabled ?? true,
      bankEnabled: settings.bankEnabled ?? true,
      cashBuyEnabled: settings.cashBuyEnabled ?? true,
      bankBuyEnabled: settings.bankBuyEnabled ?? true,
      feePercent: settings.feePercent ?? 0,
      payoutOptions: settings.payoutOptions || [],
      usdtBuyRate: settings.usdtBuyRate ?? 4.80,
      usdtSellRate: settings.usdtSellRate ?? 4.85,
      usdBuyRate: settings.usdBuyRate ?? 4.80,
      setCashRate: updateCashRate,
      setBankRate: updateBankRate,
      setCashBuyRate: updateCashBuyRate,
      setBankBuyRate: updateBankBuyRate,
      setCashEnabled: updateCashEnabled,
      setBankEnabled: updateBankEnabled,
      setCashBuyEnabled: updateCashBuyEnabled,
      setBankBuyEnabled: updateBankBuyEnabled,
      setFeePercent: updateFeePercent,
      setUsdBuyRate: updateUsdBuyRate,
      user, login, logout,
      team, addTeamMember, removeTeamMember,
      clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
