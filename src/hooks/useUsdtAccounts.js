import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapUsdtAccount = (a) => ({
  id: a.id,
  accountName: a.account_name,
  binanceEmail: a.binance_email,
  usdtBalance: Number(a.usdt_balance || 0),
  notes: a.notes || '',
  isActive: a.is_active ?? true,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

export const useUsdtAccounts = () => {
  return useQuery({
    queryKey: ['usdt_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usdt_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapUsdtAccount);
    },
  });
};

export const useUsdtAccountStats = () => {
  return useQuery({
    queryKey: ['usdt_accounts', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usdt_accounts')
        .select('usdt_balance')
        .eq('is_active', true);
      if (error) throw error;
      const totalBalance = data.reduce((sum, a) => sum + Number(a.usdt_balance || 0), 0);
      return { totalBalance, count: data.length };
    },
  });
};

export const useAddUsdtAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const id = 'USDT-' + uuidv4().slice(0, 8).toUpperCase();
      const row = {
        id,
        account_name: data.accountName,
        binance_email: data.binanceEmail || null,
        usdt_balance: data.usdtBalance || 0,
        notes: data.notes || null,
        is_active: true,
      };
      const { data: inserted, error } = await supabase
        .from('usdt_accounts')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapUsdtAccount(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_accounts'] });
    },
  });
};

export const useUpdateUsdtAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const dbChanges = {};
      if (changes.accountName !== undefined) dbChanges.account_name = changes.accountName;
      if (changes.binanceEmail !== undefined) dbChanges.binance_email = changes.binanceEmail;
      if (changes.usdtBalance !== undefined) dbChanges.usdt_balance = changes.usdtBalance;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;
      if (changes.isActive !== undefined) dbChanges.is_active = changes.isActive;
      dbChanges.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('usdt_accounts')
        .update(dbChanges)
        .eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_accounts'] });
    },
  });
};

export const useDeleteUsdtAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('usdt_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_accounts'] });
    },
  });
};
