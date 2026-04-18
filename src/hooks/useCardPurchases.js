import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const mapCardPurchase = (c) => ({
  id: c.id,
  cardNumber: c.card_number,
  cardProvider: c.card_provider,
  amountUsd: Number(c.amount_usd || 0),
  amountUsdt: Number(c.amount_usdt || 0),
  purchaseRate: Number(c.purchase_rate || 0),
  purchaseDate: c.purchase_date,
  binanceAccountId: c.binance_account_id,
  bankAccountId: c.bank_account_id,
  status: c.status,
  notes: c.notes || '',
  createdAt: c.created_at,
});

export const useCardPurchases = (options = {}) => {
  const { status, page = 0 } = options;
  
  return useQuery({
    queryKey: ['card_purchases', { status, page }],
    queryFn: async () => {
      let query = supabase
        .from('card_purchases')
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
      return { data: data.map(mapCardPurchase), total: count };
    },
  });
};

export const useAllCardPurchases = () => {
  return useQuery({
    queryKey: ['card_purchases', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data.map(mapCardPurchase);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCardPurchaseStats = () => {
  return useQuery({
    queryKey: ['card_purchases', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_purchases')
        .select('amount_usd, amount_usdt, status');
      if (error) throw error;
      
      const totalUsd = data.reduce((sum, c) => sum + Number(c.amount_usd || 0), 0);
      const totalUsdt = data.reduce((sum, c) => sum + Number(c.amount_usdt || 0), 0);
      const pending = data.filter(c => c.status === 'pending').length;
      const loaded = data.filter(c => c.status === 'loaded').length;
      const loadedUsdt = data.filter(c => c.status === 'loaded').reduce((sum, c) => sum + Number(c.amount_usdt || 0), 0);
      const redeemed = data.filter(c => c.status === 'redeemed' || c.status === 'sold').length;
      
      return { totalUsd, totalUsdt, pending, loaded, loadedUsdt, redeemed, count: data.length };
    },
  });
};

export const useAddCardPurchase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const id = 'CARD-' + uuidv4().slice(0, 8).toUpperCase();
      
      // Call the function that handles accounting (deduct USD, add to Voucher account)
      const { data: result, error: rpcError } = await supabase.rpc('execute_usdt_purchase', {
        p_purchase_id: id,
        p_source_usd_account_id: data.bankAccountId,
        p_destination_usdt_account_id: null, // Not needed for purchase to voucher (auto-selected by DB)
        p_amount_usd: data.amountUsd,
        p_amount_usdt: data.amountUsdt,
        p_purchase_rate: data.purchaseRate,
        p_notes: data.notes || '',
        p_executed_by: data.executedBy || 'admin',
        p_voucher_account_id: null // Let DB auto-detect
      });
      
      if (rpcError) throw rpcError;
      if (result && !result.success) throw new Error(result.error || 'Failed to process voucher');

      // Save the record with status loaded (since we already added to voucher account)
      const row = {
        id,
        amount_usd: data.amountUsd,
        amount_usdt: data.amountUsdt,
        purchase_rate: data.purchaseRate,
        purchase_date: data.purchaseDate,
        bank_account_id: data.bankAccountId,
        status: 'loaded', // Vouchers received and held in voucher account
        notes: data.notes || null,
      };
      
      const { data: inserted, error } = await supabase
        .from('card_purchases')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapCardPurchase(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useUpdateCardPurchase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const dbChanges = {};
      if (changes.cardNumber !== undefined) dbChanges.card_number = changes.cardNumber;
      if (changes.cardProvider !== undefined) dbChanges.card_provider = changes.cardProvider;
      if (changes.amountUsd !== undefined) dbChanges.amount_usd = changes.amountUsd;
      if (changes.amountUsdt !== undefined) dbChanges.amount_usdt = changes.amountUsdt;
      if (changes.purchaseRate !== undefined) dbChanges.purchase_rate = changes.purchaseRate;
      if (changes.purchaseDate !== undefined) dbChanges.purchase_date = changes.purchaseDate;
      if (changes.binanceAccountId !== undefined) dbChanges.binance_account_id = changes.binanceAccountId;
      if (changes.bankAccountId !== undefined) dbChanges.bank_account_id = changes.bankAccountId;
      if (changes.status !== undefined) dbChanges.status = changes.status;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;

      const { error } = await supabase
        .from('card_purchases')
        .update(dbChanges)
        .eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases'] });
    },
  });
};

export const useDeleteCardPurchase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('card_purchases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases'] });
    },
  });
};
export const useExecuteUsdtPurchase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_purchase_id: params.purchaseId,
        p_destination_usdt_account_id: params.destinationUsdtAccountId,
        p_executed_by: params.executedBy || 'admin',
        p_redeemed_by: params.redeemedBy || params.executedBy || 'admin'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
