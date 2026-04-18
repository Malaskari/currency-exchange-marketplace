import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const PAGE_SIZE = 50;

const mapSale = (s) => ({
  id: s.id,
  amount: Number(s.usd_amount),
  rate: Number(s.sell_rate) || Number(s.buy_rate) || 1,
  receivedAmount: Number(s.received_lyd),
  sourceCurrency: s.source_currency || 'USD',
  sourceAccountId: s.source_account_id || null,
  sourceAccountType: s.source_account_type || 'cash',
  destinationCurrency: s.destination_currency || 'LYD',
  destinationAccountId: s.destination_account_id || null,
  destinationAccountType: s.destination_account_type || 'bank',
  feePercent: Number(s.fee_percent || 0),
  feeAmount: Number(s.fee_amount || 0),
  notes: s.notes || '',
  timestamp: s.created_at,
  status: s.status || 'pending',
  realizedProfitUsd: Number(s.realized_profit_usd || 0),
  isRealized: s.is_realized || false,
  costBasisRate: Number(s.cost_basis_rate || 0),
});

export const useSales = (page = 0) => {
  return useQuery({
    queryKey: ['sales', { page }],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('sales')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      return { data: data.map(mapSale), total: count };
    },
  });
};

export const useAllSales = () => {
  return useQuery({
    queryKey: ['sales', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data.map(mapSale);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSalesStats = () => {
  return useQuery({
    queryKey: ['sales', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('usd_amount, received_lyd, sell_rate');
      if (error) throw error;
      
      const totalUSD = data.reduce((sum, s) => sum + Number(s.usd_amount || 0), 0);
      const totalLYD = data.reduce((sum, s) => sum + Number(s.received_lyd || 0), 0);
      const avgRate = data.length > 0 ? totalLYD / totalUSD : 0;
      
      return { totalUSD, totalLYD, avgRate, count: data.length };
    },
    staleTime: 1000 * 60,
  });
};

export const useAddSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const id = 'SALE-' + uuidv4().slice(0, 8).toUpperCase();
      
      // data contains: amount, rate (sell rate), source/dest account IDs, currencies, fee, etc.
      // Calculate received amount
      const amount = data.amount || data.usdAmount || 0;
      const rate = data.rate || data.sellRate || 1;
      const feePct = data.feePercent || 0;
      const feeAmount = amount * (feePct / 100);
      const netAmount = amount - feeAmount;
      const receivedAmount = netAmount * rate;
      
      const row = {
        id,
        usd_amount: amount,
        buy_rate: rate,
        sell_rate: rate,
        received_lyd: receivedAmount,
        source_currency: data.sourceCurrency || 'USD',
        source_account_id: data.sourceAccountId || null,
        source_account_type: data.sourceAccountType || 'cash',
        destination_currency: data.destinationCurrency || 'LYD',
        destination_account_id: data.destinationAccountId || null,
        destination_account_type: data.destinationAccountType || 'bank',
        fee_percent: feePct,
        fee_amount: feeAmount,
        notes: data.notes || '',
      };

      const { data: inserted, error } = await supabase
        .from('sales')
        .insert(row)
        .select()
        .single();
      if (error) throw error;

      // Execute the transfer
      if (data.sourceAccountId && data.destinationAccountId) {
        const { data: transferResult, error: transferError } = await supabase.rpc('execute_sale_transfer', {
          p_sale_id: id,
          p_source_account_id: data.sourceAccountId,
          p_destination_account_id: data.destinationAccountId,
          p_amount: amount,
          p_rate: rate,
          p_fee_percent: feePct,
          p_notes: data.notes || 'Currency Exchange',
          p_executed_by: data.executedBy || 'admin'
        });
        
        if (transferError) throw transferError;
        if (transferResult && !transferResult.success) throw new Error(transferResult.error || 'Transfer failed');
      }

      // Execute Inventory Logic for P&L (if exchanging with LYD)
      if (data.sourceCurrency === 'USD' || data.destinationCurrency === 'USD') {
        const action = data.sourceCurrency === 'USD' ? 'sell_usd' : 'buy_usd';
        
        await supabase.rpc('execute_exchange_with_inventory', {
          p_sale_id: id,
          p_from_account_id: data.sourceAccountId,
          p_to_account_id: data.destinationAccountId,
          p_from_amount: amount,
          p_to_amount: receivedAmount,
          p_rate: rate,
          p_from_currency: data.sourceCurrency || 'USD',
          p_to_currency: data.destinationCurrency || 'LYD',
          p_action: action,
          p_notes: data.notes || 'Exchange',
          p_executed_by: data.executedBy || 'admin'
        });
      }

      return mapSale(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
