'use server';

import { getCurrentUser } from '@/lib/auth';
import { searchAll, GlobalSearchResultItem } from '@/lib/services/search';

export type { GlobalSearchResultItem };

export async function globalSearchAction(query: string): Promise<{
  success: boolean;
  results?: {
    companies: GlobalSearchResultItem[];
    contacts: GlobalSearchResultItem[];
    remarks: GlobalSearchResultItem[];
  };
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const results = await searchAll({ user }, { q: query });
    return {
      success: true,
      results,
    };
  } catch (err: any) {
    console.error('[GLOBAL_SEARCH_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Search failed' };
  }
}
