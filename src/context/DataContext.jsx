import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

const mapRequest = (r) => ({
  id: r.id,
  direction: r.direction,
  fullName: r.full_name,
  whatsapp: r.whatsapp,
  passport: r.passport,
  iban: r.iban,
  fundSource: r.fund_source,
  payoutMethod: r.payout_method,
  usdAmount: Number(r.usd_amount),
  feePercent: Number(r.fee_percent),
  feeAmount: Number(r.fee_amount),
  effectiveUSD: Number(r.effective_usd),
  cashRate: Number(r.cash_rate),
  bankRate: Number(r.bank_rate),
  cashBuyRate: Number(r.cash_buy_rate),
  bankBuyRate: Number(r.bank_buy_rate),
  localAmount: Number(r.local_amount),
  saleRate: r.sale_rate ? Number(r.sale_rate) : null,
  status: r.status,
  notes: r.notes || '',
  timestamp: r.created_at,
});

const mapSale = (s) => ({
  id: s.id,
  usdAmount: Number(s.usd_amount),
  buyRate: Number(s.buy_rate),
  sellRate: Number(s.sell_rate),
  receivedLYD: Number(s.received_lyd),
  notes: s.notes || '',
  timestamp: s.created_at,
});

const mapTeam = (m) => ({
  id: m.id,
  username: m.username,
  email: m.email,
  role: m.role,
  joinedAt: m.joined_at,
});

export const DataProvider = ({ children }) => {
  const [team, setTeam] = useState([]);

  const saveSetting = async (key, value) => {
    await supabase.from('settings').upsert({ key, value: String(value) });
  };

  const addRequest = async (data, rates) => {
    const { cashRate, bankRate, cashBuyRate, bankBuyRate, feePercent } = rates;
    const direction = data.direction || 'sell';
    let rate;
    if (direction === 'sell') {
      rate = data.payoutMethod === 'cash' ? cashRate : bankRate;
    } else {
      rate = data.payoutMethod === 'cash' ? cashBuyRate : bankBuyRate;
    }

    const feeAmount = direction === 'sell' ? data.usdAmount * (feePercent / 100) : 0;
    const effectiveUSD = data.usdAmount - feeAmount;
    const id = 'RX-' + uuidv4().slice(0, 8).toUpperCase();

    const row = {
      id,
      direction,
      full_name: data.fullName || null,
      whatsapp: data.whatsapp || null,
      passport: data.passport || null,
      iban: data.iban || null,
      fund_source: data.fundSource || null,
      payout_method: data.payoutMethod,
      usd_amount: data.usdAmount,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      effective_usd: effectiveUSD,
      cash_rate: cashRate,
      bank_rate: bankRate,
      cash_buy_rate: cashBuyRate,
      bank_buy_rate: bankBuyRate,
      local_amount: effectiveUSD * rate,
      status: 'pending',
      notes: '',
    };

    const { data: inserted, error } = await supabase.from('requests').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return mapRequest(inserted);
  };

  const updateRequest = async (id, changes) => {
    const dbChanges = {};
    if (changes.status !== undefined) dbChanges.status = changes.status;
    if (changes.notes !== undefined) dbChanges.notes = changes.notes;
    if (changes.saleRate !== undefined) dbChanges.sale_rate = changes.saleRate;

    const { error } = await supabase.from('requests').update(dbChanges).eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  };

  const addSale = async (data) => {
    const id = 'SALE-' + uuidv4().slice(0, 8).toUpperCase();
    const row = {
      id,
      usd_amount: data.usdAmount,
      buy_rate: data.buyRate,
      sell_rate: data.sellRate,
      received_lyd: data.usdAmount * data.sellRate,
      notes: data.notes || '',
    };

    const { data: inserted, error } = await supabase.from('sales').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return mapSale(inserted);
  };

  const deleteSale = async (id) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    return !error;
  };

  const addTeamMember = async (data) => {
    const id = 'u' + Date.now();
    const row = {
      id,
      username: data.username,
      email: data.email,
      password_hash: data.password,
      role: data.role,
      joined_at: new Date().toISOString().split('T')[0],
    };

    const { data: inserted, error } = await supabase.from('team').insert(row).select().single();
    if (error) { console.error(error); return; }
    setTeam((prev) => [...prev, mapTeam(inserted)]);
  };

  const removeTeamMember = async (id) => {
    const { error } = await supabase.from('team').delete().eq('id', id);
    if (!error) setTeam((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAllData = async () => {
    const { error: err1 } = await supabase.from('requests').delete().neq('id', '0');
    const { error: err2 } = await supabase.from('sales').delete().neq('id', '0');
    if (err1 || err2) return false;
    return true;
  };

  return (
    <DataContext.Provider value={{
      team, setTeam,
      addRequest, updateRequest,
      addSale, deleteSale,
      addTeamMember, removeTeamMember,
      clearAllData,
      saveSetting,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
