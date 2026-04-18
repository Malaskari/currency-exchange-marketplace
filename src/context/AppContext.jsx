import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { data: settings = {}, isLoading: settingsLoading } = useSettings();
  const updateSettingMutation = useUpdateSetting();

  const [team, setTeam] = useState([]);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rxUser')); } catch { return null; }
  });

useEffect(() => {
    const loadTeam = async () => {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: true });
      if (data) setTeam(data.map(m => ({ id: m.id, username: m.name, email: m.email, role: m.role, joinedAt: m.created_at })));
    };
    loadTeam();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('rxUser', JSON.stringify(user));
    } else localStorage.removeItem('rxUser');
  }, [user]);

  const login = useCallback(async (username, password) => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, password_hash')
      .eq('email', username)
      .single();

    if (userData && !userError) {
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
      name: data.username,
      email: data.email,
      password_hash: data.password,
      role: data.role,
      created_at: new Date().toISOString(),
    };
    const { data: inserted } = await supabase.from('users').insert(row).select().single();
    if (inserted) setTeam((prev) => [...prev, { id: inserted.id, username: inserted.name, email: inserted.email, role: inserted.role }]);
  }, []);

  const removeTeamMember = useCallback(async (id) => {
    await supabase.from('users').delete().eq('id', id);
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
