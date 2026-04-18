import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const PAGE_SIZE = 50;

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

export const useRequests = (options = {}) => {
  const { status, page = 0, search = '' } = options;
  
  return useQuery({
    queryKey: ['requests', { status, page, search }],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,whatsapp.ilike.%${search}%,passport.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data.map(mapRequest), total: count };
    },
  });
};

export const useRequestsList = (options = {}) => {
  const { status, page = 0, search = '' } = options;
  
  return useQuery({
    queryKey: ['requests_list', { status, page, search }],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,whatsapp.ilike.%${search}%,passport.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapRequest);
    },
  });
};

export const useAllRequests = () => {
  return useQuery({
    queryKey: ['requests', 'all'],
    queryFn: async () => {
      // Safety limit: Fetch only recent requests to prevent DoS
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); 
      if (error) throw error;
      return data.map(mapRequest);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
};

export const useRequestStats = () => {
  return useQuery({
    queryKey: ['requests', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('status, created_at, effective_usd');
      if (error) throw error;
      
      const total = data.length;
      const completed = data.filter(r => r.status === 'completed').length;
      const pending = data.filter(r => r.status === 'pending').length;
      const totalUSD = data.reduce((sum, r) => sum + Number(r.effective_usd || 0), 0);
      
      return { total, completed, pending, totalUSD };
    },
    staleTime: 1000 * 60,
  });
};

export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, changes, updatedBy }) => {
      const dbChanges = {};
      if (changes.status !== undefined) {
        dbChanges.status = changes.status;
        // If status changing to completed, set executed_by/stamp
        if (changes.status === 'completed') {
          dbChanges.executed_by = updatedBy || 'system';
          dbChanges.executed_at = new Date().toISOString();
        }
        // If status changing to processing, set confirmed_by/stamp
        if (changes.status === 'processing') {
          dbChanges.confirmed_by = updatedBy || 'system';
          dbChanges.confirmed_at = new Date().toISOString();
        }
      }
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;
      if (changes.saleRate !== undefined) dbChanges.sale_rate = changes.saleRate;

      // Always track who updated it last
      if (updatedBy) {
        dbChanges.updated_by = updatedBy;
        dbChanges.updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('requests')
        .update(dbChanges)
        .eq('id', id);
      if (error) throw error;
      return { id, changes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};

export const useAddRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ data, rates }) => {
      const { cashRate, bankRate, cashBuyRate, bankBuyRate, payoutOptions } = rates;
      const direction = data.direction || 'sell';
      
      // Find the selected payout option to get its rate
      const selectedPayout = payoutOptions?.find(p => p.id === data.payoutMethod);
      let rate;
      
      if (selectedPayout?.rate) {
        rate = selectedPayout.rate;
      } else if (direction === 'sell') {
        rate = data.payoutMethod === 'cash' ? cashRate : bankRate;
      } else {
        rate = data.payoutMethod === 'cash' ? cashBuyRate : bankBuyRate;
      }

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
        cash_rate: cashRate,
        bank_rate: bankRate,
        cash_buy_rate: cashBuyRate,
        bank_buy_rate: bankBuyRate,
        local_amount: data.usdAmount * rate,
        status: 'pending',
        notes: '',
        created_by_role: data.createdByRole || 'client', // 'client' or 'internal'
        created_by_username: data.createdByUsername || null, // internal user who created it (if internal)
      };

      const { data: inserted, error } = await supabase
        .from('requests')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapRequest(inserted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};
export const useExecuteUsdPurchaseRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('execute_usd_purchase_request', {
        p_request_id: params.requestId,
        p_payout_account_id: params.payoutAccountId,
        p_destination_usd_account_id: params.destinationUsdAccountId,
        p_execution_rate: params.executionRate,
        p_fee_percent: params.feePercent || 0,
        p_execution_notes: params.executionNotes || '',
        p_executed_by: params.executedBy
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
