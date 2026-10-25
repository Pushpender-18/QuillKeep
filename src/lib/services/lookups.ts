import { prisma } from '@/lib/prisma';
import {
  getRankedIndustries,
  getStates,
  getProfiles,
  getCustomFieldDefinitionsCached,
} from '@/lib/lookups';
import { ServiceContext } from './companies';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getLookups(_ctx?: ServiceContext) {
  const [rankedIndustries, allStates, allProfiles, customFieldDefs] = await Promise.all([
    getRankedIndustries(),
    getStates(),
    getProfiles(),
    getCustomFieldDefinitionsCached(),
  ]);

  const activeIndustries = rankedIndustries
    .filter((i) => i.isActive !== false)
    .map((i) => ({
      id: i.id,
      name: i.name,
      isActive: i.isActive,
      uses: (i as any).uses || 0,
      companyCount: (i as any).companyCount || 0,
    }));

  const activeStates = allStates
    .filter((s) => s.isActive !== false)
    .map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
    }));

  const activeProfiles = allProfiles
    .filter((p) => p.isActive !== false)
    .map((p) => ({
      id: p.id,
      fullName: p.fullName || p.name || '',
      email: p.email || '',
      isActive: p.isActive,
    }));

  const activeCustomFields = customFieldDefs
    .filter((d) => d.isActive !== false)
    .map((d) => ({
      id: d.id,
      name: d.name,
      fieldType: d.fieldType,
      options: d.options,
      isActive: d.isActive,
    }));

  return {
    industries: activeIndustries,
    states: activeStates,
    profiles: activeProfiles,
    customFields: activeCustomFields,
  };
}

export async function recordIndustryFilterUse(
  ctx: ServiceContext,
  input: { industryIds: string[] }
) {
  const validIds = input.industryIds
    .filter((id) => UUID_REGEX.test(id))
    .slice(0, 20);

  if (validIds.length > 0) {
    try {
      await prisma.$executeRaw`select record_industry_filter_use(${ctx.user.id}::uuid, ${validIds}::uuid[])`;
    } catch (err: any) {
      console.error('[SERVICE_RECORD_INDUSTRY_FILTER_USE_ERROR]', err?.code || 'UNKNOWN');
    }
  }

  return { success: true };
}
