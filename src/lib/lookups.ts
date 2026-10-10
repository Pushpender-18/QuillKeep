import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getCustomFieldDefinitions as fetchCustomFieldDefs, CustomFieldDefinition } from './custom-fields';

export interface CleanIndustry {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CleanState {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CleanProfile {
  id: string;
  fullName: string;
  email: string;
  name: string;
  isActive: boolean;
}

export const getIndustries = unstable_cache(
  async (): Promise<CleanIndustry[]> => {
    try {
      const raw = await prisma.orm.public.Industries.all();
      return convertBigInts(raw).map((i: any) => ({
        id: String(i.id),
        name: String(i.name),
        isActive: Boolean(i.isActive),
      }));
    } catch (err) {
      console.error('[GET_INDUSTRIES_LOOKUP_ERROR]', err);
      return [];
    }
  },
  ['lookup-industries'],
  { tags: ['industries'], revalidate: 300 }
);

export const getStates = unstable_cache(
  async (): Promise<CleanState[]> => {
    try {
      const raw = await prisma.orm.public.States.all();
      return convertBigInts(raw).map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        isActive: Boolean(s.isActive),
      }));
    } catch (err) {
      console.error('[GET_STATES_LOOKUP_ERROR]', err);
      return [];
    }
  },
  ['lookup-states'],
  { tags: ['states'], revalidate: 300 }
);

export const getProfiles = unstable_cache(
  async (): Promise<CleanProfile[]> => {
    try {
      const raw = await prisma.orm.public.Profiles.all();
      return convertBigInts(raw).map((p: any) => ({
        id: String(p.id),
        fullName: String(p.fullName || ''),
        email: String(p.email || ''),
        name: String(p.fullName || p.email || 'User'),
        isActive: Boolean(p.isActive),
      }));
    } catch (err) {
      console.error('[GET_PROFILES_LOOKUP_ERROR]', err);
      return [];
    }
  },
  ['lookup-profiles'],
  { tags: ['profiles'], revalidate: 300 }
);

export const getCustomFieldDefinitionsCached = unstable_cache(
  async (): Promise<CustomFieldDefinition[]> => {
    return fetchCustomFieldDefs();
  },
  ['lookup-custom-fields'],
  { tags: ['custom-fields'], revalidate: 300 }
);
