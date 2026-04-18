import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapBankAccount = (a) => ({
  id: a.id,
  bankName: a.bank_name,
  accountNumber: a.account_number,
  accountHolder: a.account_holder,
  balance: Number(a.balance || 0),
  currency: a.currency || 'LYD',
  notes: a.notes || '',
  isActive: a.is_active ?? true,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

export const useBankAccounts = () => {
  return useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapBankAccount);
    },
  });
};

export const useAllBankAccounts = () => {
  return useQuery({
    queryKey: ['bank_accounts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapBankAccount);
    },
  });
};

export const useBankAccountStats = () => {
  return useQuery({
    queryKey: ['bank_accounts', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('is_active', true);
      if (error) throw error;
      const totalBalance = data.reduce((sum, a) => sum + Number(a.balance || 0), 0);
      return { totalBalance, count: data.length };
    },
  });
};

export const useAddBankAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const id = uuidv4().slice(0, 8).toUpperCase();
      const row = {
        id,
        bank_name: data.bankName,
        account_number: data.accountNumber,
        account_holder: data.accountHolder || null,
        balance: data.balance || 0,
        currency: 'LYD',
        notes: data.notes || null,
        is_active: true,
      };
      const { data: inserted, error } = await supabase
        .from('bank_accounts')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapBankAccount(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    },
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const dbChanges = {};
      if (changes.bankName !== undefined) dbChanges.bank_name = changes.bankName;
      if (changes.accountNumber !== undefined) dbChanges.account_number = changes.accountNumber;
      if (changes.accountHolder !== undefined) dbChanges.account_holder = changes.accountHolder;
      if (changes.balance !== undefined) dbChanges.balance = changes.balance;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;
      if (changes.isActive !== undefined) dbChanges.is_active = changes.isActive;
      dbChanges.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('bank_accounts')
        .update(dbChanges)
        .eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    },
  });
};

export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    },
  });
};
