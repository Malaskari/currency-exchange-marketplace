import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapAccount = (a) => ({
  id: a.id,
  accountName: a.account_name,
  accountType: a.account_type,
  currency: a.currency,
  balance: Number(a.balance || 0),
  institutionName: a.institution_name || '',
  accountNumber: a.account_number || '',
  iban: a.iban || '',
  binanceEmail: a.binance_email || '',
  notes: a.notes || '',
  isActive: a.is_active,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

export const useAccounts = (options = {}) => {
  const { currency, isActive = true } = options;
  return useQuery({
    queryKey: ['accounts', { currency, isActive }],
    queryFn: async () => {
      let query = supabase.from('accounts').select('*').order('account_name', { ascending: true });
      if (currency) query = query.eq('currency', currency);
      if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapAccount);
    },
  });
};

export const useAccount = (id) => {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
      if (error) throw error;
      return mapAccount(data);
    },
    enabled: !!id,
  });
};

export const useAccountSummary = () => {
  return useQuery({
    queryKey: ['accounts', 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_account_summary');
      if (error) throw error;
      return data; // Returns [{ currency, total_balance, account_count }]
    },
  });
};

export const useAddAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const id = 'ACC-' + uuidv4().slice(0, 8).toUpperCase();
      const row = {
        id,
        account_name: data.accountName,
        account_type: data.accountType,
        currency: data.currency,
        balance: data.balance || 0,
        institution_name: data.institutionName || null,
        account_number: data.account_number || null,
        iban: data.iban || null,
        binance_email: data.binanceEmail || null,
        notes: data.notes || null,
        is_active: true,
      };
      const { data: inserted, error } = await supabase.from('accounts').insert(row).select().single();
      if (error) throw error;
      return mapAccount(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const dbChanges = {};
      if (changes.accountName !== undefined) dbChanges.account_name = changes.accountName;
      if (changes.accountType !== undefined) dbChanges.account_type = changes.accountType;
      if (changes.currency !== undefined) dbChanges.currency = changes.currency;
      if (changes.balance !== undefined) dbChanges.balance = changes.balance;
      if (changes.institutionName !== undefined) dbChanges.institution_name = changes.institutionName;
      if (changes.accountNumber !== undefined) dbChanges.account_number = changes.accountNumber;
      if (changes.iban !== undefined) dbChanges.iban = changes.iban;
      if (changes.binanceEmail !== undefined) dbChanges.binance_email = changes.binanceEmail;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;
      if (changes.isActive !== undefined) dbChanges.is_active = changes.isActive;

      const { error } = await supabase.from('accounts').update(dbChanges).eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
    },
  });
};
