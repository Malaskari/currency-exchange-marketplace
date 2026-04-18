import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const settings = {};
      data.forEach(row => {
        const value = row.value;
        if (value === 'true') settings[row.key] = true;
        else if (value === 'false') settings[row.key] = false;
        else if (!isNaN(parseFloat(value)) && isFinite(value)) settings[row.key] = parseFloat(value);
        else {
          try {
            settings[row.key] = JSON.parse(value);
          } catch {
            settings[row.key] = value;
          }
        }
      });
      
      return {
        ...settings,
        cashRate: settings.cashRate ?? 4.85,
        bankRate: settings.bankRate ?? 4.80,
        cashBuyRate: settings.cashBuyRate ?? 4.92,
        bankBuyRate: settings.bankBuyRate ?? 4.88,
        cashEnabled: settings.cashEnabled ?? true,
        bankEnabled: settings.bankEnabled ?? true,
        cashBuyEnabled: settings.cashBuyEnabled ?? true,
        bankBuyEnabled: settings.bankBuyEnabled ?? true,
        feePercent: settings.feePercent ?? 0,
        usdtSellRate: settings.usdtSellRate ?? 4.85,
        usdBuyRate: settings.usdBuyRate ?? 4.80,
        sourceOptions: settings.sourceOptions || null,
        payoutOptions: settings.payoutOptions || null,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value: String(value) }, { onConflict: 'key' });
      if (error) throw error;
      return { key, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};
