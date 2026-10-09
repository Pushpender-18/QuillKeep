import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';

export interface SerializableRemark {
  id: string;
  companyId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorIsActive: boolean;
  body: string;
  mentions: string[];
  editedAt: string | null;
  createdAt: string;
}

export interface GetRemarksOptions {
  companyId: string;
  limit?: number;
  offset?: number;
}

export async function getRemarksForCompany(options: GetRemarksOptions): Promise<{
  remarks: SerializableRemark[];
  totalCount: number;
}> {
  const { companyId, limit = 20, offset = 0 } = options;

  let rawRemarks: any[] = [];
  let rawProfiles: any[] = [];

  try {
    rawRemarks = await prisma.orm.public.Remarks.where({ companyId }).all();
    rawProfiles = await prisma.orm.public.Profiles.all();
  } catch (err) {
    console.error('[GET_REMARKS_ERROR]', err);
    return { remarks: [], totalCount: 0 };
  }

  const cleanRemarks = convertBigInts(rawRemarks);
  const cleanProfiles = convertBigInts(rawProfiles);

  const profileMap = new Map(
    cleanProfiles.map((p: any) => [
      String(p.id),
      {
        fullName: String(p.fullName || p.email || 'User'),
        email: String(p.email || ''),
        isActive: Boolean(p.isActive ?? true),
      },
    ])
  );

  // Sort remarks: newest first
  cleanRemarks.sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCount = cleanRemarks.length;
  const pagedRemarks = cleanRemarks.slice(offset, offset + limit);

  const remarks: SerializableRemark[] = pagedRemarks.map((r: any) => {
    const authorIdStr = String(r.authorId);
    const authorInfo = profileMap.get(authorIdStr) || {
      fullName: 'Unknown Author',
      email: '',
      isActive: false,
    };

    const mentionsArr: string[] = Array.isArray(r.mentions)
      ? r.mentions.map((m: any) => String(m))
      : [];

    return {
      id: String(r.id),
      companyId: String(r.companyId),
      authorId: authorIdStr,
      authorName: authorInfo.fullName,
      authorEmail: authorInfo.email,
      authorIsActive: authorInfo.isActive,
      body: String(r.body),
      mentions: mentionsArr,
      editedAt: r.editedAt ? String(r.editedAt) : null,
      createdAt: String(r.createdAt),
    };
  });

  return { remarks, totalCount };
}
