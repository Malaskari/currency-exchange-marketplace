import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapUsdtSale = (s) => ({
  id: s.id,
  customerName: s.customer_name,
  customerPhone: s.customer_phone,
  customerIban: s.customer_iban,
  amountUsdt: Number(s.amount_usdt || 0),
  amountLyd: Number(s.amount_lyd || 0),
  rateUsed: Number(s.rate_used || 0),
  binanceAccountId: s.binance_account_id,
  bankAccountId: s.bank_account_id,
  status: s.status,
  saleDate: s.sale_date,
  notes: s.notes || '',
  createdAt: s.created_at,
});

export const useUsdtSales = (options = {}) => {
  const { status, page = 0 } = options;
  
  return useQuery({
    queryKey: ['usdt_sales', { status, page }],
    queryFn: async () => {
      let query = supabase
        .from('usdt_sales')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const from = page * 50;
      const to = from + 49;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data.map(mapUsdtSale), total: count };
    },
  });
};

export const useAllUsdtSales = () => {
  return useQuery({
    queryKey: ['usdt_sales', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usdt_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data.map(mapUsdtSale);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUsdtSaleStats = () => {
  return useQuery({
    queryKey: ['usdt_sales', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usdt_sales')
        .select('amount_usdt, amount_lyd, status');
      if (error) throw error;
      
      const completed = data.filter(s => s.status === 'completed');
      const totalUsdtSold = completed.reduce((sum, s) => sum + Number(s.amount_usdt || 0), 0);
      const totalLydReceived = completed.reduce((sum, s) => sum + Number(s.amount_lyd || 0), 0);
      const pending = data.filter(s => s.status === 'pending').length;
      
      return { totalUsdtSold, totalLydReceived, pending, count: data.length };
    },
  });
};

export const useAddUsdtSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const id = 'USDT-' + uuidv4().slice(0, 8).toUpperCase();
      const row = {
        id,
        customer_name: data.customerName || null,
        customer_phone: data.customerPhone || null,
        customer_iban: data.customerIban || null,
        amount_usdt: data.amountUsdt,
        amount_lyd: data.amountLyd,
        rate_used: data.rateUsed,
        binance_account_id: data.binanceAccountId || null,
        bank_account_id: data.bankAccountId || null,
        status: 'pending',
        sale_date: new Date().toISOString(),
        notes: data.notes || null,
      };
      const { data: inserted, error } = await supabase
        .from('usdt_sales')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapUsdtSale(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_sales'] });
    },
  });
};

export const useUpdateUsdtSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const dbChanges = {};
      if (changes.customerName !== undefined) dbChanges.customer_name = changes.customerName;
      if (changes.customerPhone !== undefined) dbChanges.customer_phone = changes.customerPhone;
      if (changes.customerIban !== undefined) dbChanges.customer_iban = changes.customerIban;
      if (changes.amountUsdt !== undefined) dbChanges.amount_usdt = changes.amountUsdt;
      if (changes.amountLyd !== undefined) dbChanges.amount_lyd = changes.amountLyd;
      if (changes.rateUsed !== undefined) dbChanges.rate_used = changes.rateUsed;
      if (changes.binanceAccountId !== undefined) dbChanges.binance_account_id = changes.binanceAccountId;
      if (changes.bankAccountId !== undefined) dbChanges.bank_account_id = changes.bankAccountId;
      if (changes.status !== undefined) dbChanges.status = changes.status;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;

      const { error } = await supabase
        .from('usdt_sales')
        .update(dbChanges)
        .eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_sales'] });
    },
  });
};

export const useDeleteUsdtSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('usdt_sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_sales'] });
    },
  });
};
export const useExecuteUsdtSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('execute_usdt_sale', {
        p_sale_id: params.saleId,
        p_source_usdt_account_id: params.sourceUsdtAccountId,
        p_destination_lyd_account_id: params.destinationLydAccountId,
        p_amount_usdt: params.amountUsdt,
        p_rate_used: params.rateUsed,
        p_notes: params.notes || '',
        p_executed_by: params.executedBy
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdt_sales'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
