import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const mapTransaction = (t) => ({
  id: t.id,
  transactionType: t.transaction_type,
  referenceTable: t.reference_table,
  referenceId: t.reference_id,
  fromAccountId: t.from_account_id,
  toAccountId: t.to_account_id,
  fromAccountName: t.from_account?.account_name || 'N/A',
  toAccountName: t.to_account?.account_name || 'N/A',
  fromCurrency: t.from_currency,
  toCurrency: t.to_currency,
  amountFrom: Number(t.amount_from),
  amountTo: Number(t.amount_to),
  rate: t.rate ? Number(t.rate) : null,
  feePercent: Number(t.fee_percent || 0),
  feeAmount: Number(t.fee_amount || 0),
  status: t.status,
  notes: t.notes || '',
  createdBy: t.created_by,
  createdAt: t.created_at,
});

export const useTransactions = (options = {}) => {
  const { type, accountId, page = 0, limit = 50 } = options;
  return useQuery({
    queryKey: ['transactions', { type, accountId, page, limit }],
    queryFn: async () => {
      let query = supabase
        .from('account_transactions')
        .select(`
          *,
          from_account:accounts!from_account_id(account_name),
          to_account:accounts!to_account_id(account_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (type && type !== 'all') query = query.eq('transaction_type', type);
      if (accountId) {
        query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data.map(mapTransaction), total: count };
    },
  });
};

export const useCreateManualTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('create_manual_transfer', {
        p_from_account_id: params.fromAccountId,
        p_to_account_id: params.toAccountId,
        p_amount_from: params.amountFrom,
        p_amount_to: params.amountTo,
        p_rate: params.rate || null,
        p_notes: params.notes || '',
        p_executed_by: params.executedBy,
        p_fee_percent: params.feePercent || 0,
        p_fee_amount: params.feeAmount || 0,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useCreateManualAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('create_manual_adjustment', {
        p_account_id: params.accountId,
        p_adjustment_direction: params.direction,
        p_amount: params.amount,
        p_notes: params.notes || '',
        p_executed_by: params.executedBy
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
