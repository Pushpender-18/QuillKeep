import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { db } from '@/prisma/db';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Route handlers
import { GET as getMeta } from '@/app/api/v1/meta/route';
import { GET as getCompanies, POST as createCompanyRoute } from '@/app/api/v1/companies/route';
import { GET as getCompanyById, PATCH as updateCompanyRoute } from '@/app/api/v1/companies/[id]/route';
import { POST as changeStatusRoute } from '@/app/api/v1/companies/[id]/status/route';
import { POST as bulkStatusRoute } from '@/app/api/v1/companies/status/route';
import { POST as archiveRoute } from '@/app/api/v1/companies/archive/route';
import { POST as deleteRoute } from '@/app/api/v1/companies/delete/route';
import { POST as addContactRoute } from '@/app/api/v1/companies/[id]/contacts/route';
import { POST as postRemarkRoute } from '@/app/api/v1/companies/[id]/remarks/route';
import { PATCH as updateRemarkRoute } from '@/app/api/v1/remarks/[id]/route';
import { POST as createReminderRoute } from '@/app/api/v1/reminders/route';

// Web list query function to verify parity
import { listCompanies } from '@/lib/services/companies';

const USER_A_ID = '11111111-aaaa-4111-8111-111111111111';
const USER_A_EMAIL = '__test_teammate_a@ausmi.com';

const USER_B_ID = '22222222-bbbb-4222-8222-222222222222';
const USER_B_EMAIL = '__test_teammate_b@ausmi.com';

const USER_C_ID = '33333333-cccc-4333-8333-333333333333';
const USER_C_EMAIL = '__test_teammate_c@ausmi.com';

const TEST_PASSWORD = 'TestPassword123!';

let tokenA = '';
let tokenB = '';
let tokenC = '';

async function runSql(sql: string) {
  const drv = (db.runtime() as any).driver;
  await drv.execute({ sql, params: [] });
}

async function cleanupTestData() {
  // Clean up all __test__ companies and linked rows
  const statements = [
    `select set_config('app.deleting_companies', 'on', false)`,
    `delete from notifications where company_id in (select id from companies where name like '%test%')`,
    `delete from reminders where company_id in (select id from companies where name like '%test%')`,
    `delete from remarks where company_id in (select id from companies where name like '%test%')`,
    `delete from history_log where company_id in (select id from companies where name like '%test%')`,
    `delete from contacts where company_id in (select id from companies where name like '%test%')`,
    `delete from companies where name like '%test%'`,
    `select set_config('app.deleting_companies', 'off', false)`,
  ];
  for (const stmt of statements) {
    try {
      await runSql(stmt);
    } catch (e) {
      console.error('Cleanup error on:', stmt, e);
    }
  }
}

async function setupTestUsers() {
  await cleanupTestData();

  const userTuples = [
    { id: USER_A_ID, email: USER_A_EMAIL, name: '__test__ Teammate A', active: true },
    { id: USER_B_ID, email: USER_B_EMAIL, name: '__test__ Teammate B', active: true },
    { id: USER_C_ID, email: USER_C_EMAIL, name: '__test__ Deactivated C', active: false },
  ];

  for (const u of userTuples) {
    const userSql = `
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
        phone_change, phone_change_token, email_change_token_current, email_change_confirm_status,
        banned_until, reauthentication_token, is_sso_user, is_anonymous
      ) values (
        '${u.id}'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        '${u.email}', crypt('${TEST_PASSWORD}', gen_salt('bf', 10)), now(),
        '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb,
        false, now(), now(), '', '', '', 0, null, '', false, false
      )
      on conflict (id) do nothing
    `;
    await runSql(userSql);

    const idSql = `
      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), '${u.id}', '${u.id}'::uuid,
        jsonb_build_object('sub', '${u.id}', 'email', '${u.email}', 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
      )
      on conflict (provider_id, provider) do nothing
    `;
    await runSql(idSql);

    // Update profile isActive
    const profileSql = `
      update profiles set full_name = '${u.name}', is_active = ${u.active} where id = '${u.id}'::uuid;
    `;
    await runSql(profileSql);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [resA, resB, resC] = await Promise.all([
    supabase.auth.signInWithPassword({ email: USER_A_EMAIL, password: TEST_PASSWORD }),
    supabase.auth.signInWithPassword({ email: USER_B_EMAIL, password: TEST_PASSWORD }),
    supabase.auth.signInWithPassword({ email: USER_C_EMAIL, password: TEST_PASSWORD }),
  ]);

  tokenA = resA.data.session!.access_token;
  tokenB = resB.data.session!.access_token;
  tokenC = resC.data.session!.access_token;
}

function req(url: string, options: { method?: string; token?: string; body?: any } = {}) {
  const { method = 'GET', token, body } = options;
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Contract Tests for Mobile JSON API (v1)', () => {
  before(async () => {
    await setupTestUsers();
  });

  after(async () => {
    await cleanupTestData();
  });

  test('1. No token gives 401 unauthenticated', async () => {
    const r = req('/api/v1/meta');
    const res = await getMeta(r);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error?.code, 'unauthenticated');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('X-Api-Version'), '1');
  });

  test('2. A deactivated user gets 403 account_inactive', async () => {
    const r = req('/api/v1/meta', { token: tokenC });
    const res = await getMeta(r);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error?.code, 'account_inactive');
  });

  test('3. Mandatory date enforced (missing, past)', async () => {
    // Missing date for contact_later
    const r1 = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: {
        name: '__test__ Co Date Required',
        initialStatus: 'contact_later',
      },
    });
    const res1 = await createCompanyRoute(r1);
    assert.equal(res1.status, 400);
    const json1 = await res1.json();
    assert.equal(json1.ok, false);
    assert.equal(json1.error?.code, 'date_required');

    // Past date for meeting_scheduled
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const r2 = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: {
        name: '__test__ Co Past Date',
        initialStatus: 'meeting_scheduled',
        dueAt: pastDate,
        reminderType: 'meeting',
      },
    });
    const res2 = await createCompanyRoute(r2);
    assert.equal(res2.status, 400);
    const json2 = await res2.json();
    assert.equal(json2.ok, false);
    assert.equal(json2.error?.code, 'past_date');
  });

  test('4. Duplicate name (case-insensitive, archived included)', async () => {
    // 1. Create first company
    const r1 = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ Acme Unique Co' },
    });
    const res1 = await createCompanyRoute(r1);
    assert.equal(res1.status, 201);
    const json1 = await res1.json();
    const companyId = json1.data.id;

    // 2. Duplicate active company name (case-insensitive)
    const r2 = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '  __test__ acme unique co  ' },
    });
    const res2 = await createCompanyRoute(r2);
    assert.equal(res2.status, 409);
    const json2 = await res2.json();
    assert.equal(json2.ok, false);
    assert.equal(json2.error?.code, 'duplicate_name');

    // 3. Archive company, then try creating another with same name
    const rArchive = req('/api/v1/companies/archive', {
      method: 'POST',
      token: tokenA,
      body: { id: companyId, reason: 'Testing duplicate on archive' },
    });
    await archiveRoute(rArchive);

    const r3 = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ ACME UNIQUE CO' },
    });
    const res3 = await createCompanyRoute(r3);
    assert.equal(res3.status, 400);
    const json3 = await res3.json();
    assert.equal(json3.ok, false);
    assert.equal(json3.error?.code, 'archived_company');
  });

  test('5. Archived company writes rejected', async () => {
    // Create and archive a test company
    const rCreate = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ Archived Write Reject Co' },
    });
    const resCreate = await createCompanyRoute(rCreate);
    const compId = (await resCreate.json()).data.id;

    await archiveRoute(req('/api/v1/companies/archive', {
      method: 'POST',
      token: tokenA,
      body: { id: compId },
    }));

    // Status change rejected
    const rStatus = req(`/api/v1/companies/${compId}/status`, {
      method: 'POST',
      token: tokenA,
      body: { status: 'contacted' },
    });
    const resStatus = await changeStatusRoute(rStatus, { params: Promise.resolve({ id: compId }) });
    assert.equal(resStatus.status, 400);
    const jsonStatus = await resStatus.json();
    assert.equal(jsonStatus.error?.code, 'archived_company');

    // Company update rejected
    const rUpdate = req(`/api/v1/companies/${compId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { location: 'New Location' },
    });
    const resUpdate = await updateCompanyRoute(rUpdate, { params: Promise.resolve({ id: compId }) });
    assert.equal(resUpdate.status, 400);
    const jsonUpdate = await resUpdate.json();
    assert.equal(jsonUpdate.error?.code, 'archived_company');

    // Contact add rejected
    const rContact = req(`/api/v1/companies/${compId}/contacts`, {
      method: 'POST',
      token: tokenA,
      body: { name: 'John Contact' },
    });
    const resContact = await addContactRoute(rContact, { params: Promise.resolve({ id: compId }) });
    assert.equal(resContact.status, 400);
    const jsonContact = await resContact.json();
    assert.equal(jsonContact.error?.code, 'archived_company');

    // Remark post rejected
    const rRemark = req(`/api/v1/companies/${compId}/remarks`, {
      method: 'POST',
      token: tokenA,
      body: { body: 'New Remark' },
    });
    const resRemark = await postRemarkRoute(rRemark, { params: Promise.resolve({ id: compId }) });
    assert.equal(resRemark.status, 400);
    const jsonRemark = await resRemark.json();
    assert.equal(jsonRemark.error?.code, 'archived_company');

    // Reminder creation rejected
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const rReminder = req('/api/v1/reminders', {
      method: 'POST',
      token: tokenA,
      body: {
        companyId: compId,
        type: 'callback',
        dueAt: futureDate,
        assignedTo: USER_A_ID,
      },
    });
    const resReminder = await createReminderRoute(rReminder);
    assert.equal(resReminder.status, 400);
    const jsonReminder = await resReminder.json();
    assert.equal(jsonReminder.error?.code, 'archived_company');
  });

  test('6. A remark can only be edited by its author', async () => {
    // 1. User A creates company and remark
    const rComp = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ Remark Author Test Co' },
    });
    const resComp = await createCompanyRoute(rComp);
    const compId = (await resComp.json()).data.id;

    const rRemark = req(`/api/v1/companies/${compId}/remarks`, {
      method: 'POST',
      token: tokenA,
      body: { body: 'Initial remark written by User A' },
    });
    const resRemark = await postRemarkRoute(rRemark, { params: Promise.resolve({ id: compId }) });
    const remarkId = (await resRemark.json()).data.id;

    // 2. User B attempts to edit User A's remark -> forbidden (403)
    const rEditB = req(`/api/v1/remarks/${remarkId}`, {
      method: 'PATCH',
      token: tokenB,
      body: { body: 'Unauthorized edit attempt by User B' },
    });
    const resEditB = await updateRemarkRoute(rEditB, { params: Promise.resolve({ id: remarkId }) });
    assert.equal(resEditB.status, 403);
    const jsonEditB = await resEditB.json();
    assert.equal(jsonEditB.ok, false);
    assert.equal(jsonEditB.error?.code, 'forbidden');

    // 3. User A edits own remark -> success (200)
    const rEditA = req(`/api/v1/remarks/${remarkId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { body: 'Authorized edit by author User A' },
    });
    const resEditA = await updateRemarkRoute(rEditA, { params: Promise.resolve({ id: remarkId }) });
    assert.equal(resEditA.status, 200);
    const jsonEditA = await resEditA.json();
    assert.equal(jsonEditA.ok, true);
  });

  test('7. Mentions stripped for self and inactive users', async () => {
    const rComp = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ Mention Stripping Co' },
    });
    const resComp = await createCompanyRoute(rComp);
    const compId = (await resComp.json()).data.id;

    // Body contains @__test__ Teammate A (self), @__test__ Deactivated C (inactive), @__test__ Teammate B (active)
    const remarkBody = 'Hello @__test__ Teammate A and @__test__ Deactivated C and @__test__ Teammate B!';
    const rRemark = req(`/api/v1/companies/${compId}/remarks`, {
      method: 'POST',
      token: tokenA,
      body: {
        body: remarkBody,
        mentionIds: [USER_A_ID, USER_C_ID, USER_B_ID],
      },
    });
    const resRemark = await postRemarkRoute(rRemark, { params: Promise.resolve({ id: compId }) });
    assert.equal(resRemark.status, 201);
    const remarkId = (await resRemark.json()).data.id;

    // Query remark from DB to check stored mentions
    const savedRemark = await prisma.orm.public.Remarks.where({ id: remarkId }).first();
    const savedMentions = (savedRemark?.mentions as string[]) || [];

    assert.equal(savedMentions.length, 1);
    assert.equal(savedMentions[0], USER_B_ID);
    assert.ok(!savedMentions.includes(USER_A_ID), 'Self-mention was stripped');
    assert.ok(!savedMentions.includes(USER_C_ID), 'Inactive user mention was stripped');
  });

  test('8. Bulk over 500 rejected', async () => {
    // Generate 501 dummy UUIDs
    const ids501 = Array.from({ length: 501 }, (_, i) => {
      const hex = i.toString(16).padStart(12, '0');
      return `00000000-0000-4000-8000-${hex}`;
    });

    const r = req('/api/v1/companies/status', {
      method: 'POST',
      token: tokenA,
      body: {
        ids: ids501,
        status: 'contacted',
      },
    });
    const res = await bulkStatusRoute(r);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error?.code, 'too_many');
  });

  test('9. Delete rejected for active company & wrong confirmText, accepted for archived', async () => {
    // 1. Create company
    const rCreate = req('/api/v1/companies', {
      method: 'POST',
      token: tokenA,
      body: { name: '__test__ Permanent Delete Co' },
    });
    const resCreate = await createCompanyRoute(rCreate);
    const compId = (await resCreate.json()).data.id;

    // Add linked contact
    await addContactRoute(
      req(`/api/v1/companies/${compId}/contacts`, {
        method: 'POST',
        token: tokenA,
        body: { name: '__test__ Linked Contact' },
      }),
      { params: Promise.resolve({ id: compId }) }
    );

    // Delete active company -> rejected with archived_company
    const rDelActive = req('/api/v1/companies/delete', {
      method: 'POST',
      token: tokenA,
      body: { ids: [compId], confirmText: '__test__ Permanent Delete Co' },
    });
    const resDelActive = await deleteRoute(rDelActive);
    assert.equal(resDelActive.status, 400);
    const jsonDelActive = await resDelActive.json();
    assert.equal(jsonDelActive.error?.code, 'archived_company');

    // Archive the company
    await archiveRoute(req('/api/v1/companies/archive', {
      method: 'POST',
      token: tokenA,
      body: { id: compId },
    }));

    // Delete with wrong confirmText -> confirm_mismatch
    const rDelWrong = req('/api/v1/companies/delete', {
      method: 'POST',
      token: tokenA,
      body: { ids: [compId], confirmText: 'WRONG_CONFIRM' },
    });
    const resDelWrong = await deleteRoute(rDelWrong);
    assert.equal(resDelWrong.status, 400);
    const jsonDelWrong = await resDelWrong.json();
    assert.equal(jsonDelWrong.error?.code, 'confirm_mismatch');

    // Delete with correct confirmText -> success (deletedCount: 1)
    const rDelCorrect = req('/api/v1/companies/delete', {
      method: 'POST',
      token: tokenA,
      body: { ids: [compId], confirmText: '__test__ Permanent Delete Co' },
    });
    const resDelCorrect = await deleteRoute(rDelCorrect);
    assert.equal(resDelCorrect.status, 200);
    const jsonDelCorrect = await resDelCorrect.json();
    assert.equal(jsonDelCorrect.ok, true);
    assert.equal(jsonDelCorrect.data?.deletedCount, 1);

    // Verify company and linked contacts are gone
    const drv = (db.runtime() as any).driver;
    const genComp = drv.query({ sql: 'select count(*)::int as c from companies where id = $1::uuid', params: [compId] });
    for await (const row of genComp) {
      assert.equal(Number((row as any).c), 0);
    }
    const genCt = drv.query({ sql: 'select count(*)::int as c from contacts where company_id = $1::uuid', params: [compId] });
    for await (const row of genCt) {
      assert.equal(Number((row as any).c), 0);
    }
  });

  test('10. Pagination and sorting match the web list for the same parameters', async () => {
    // Call service layer (used by web)
    const webResult = await listCompanies(
      { user: { id: USER_A_ID } },
      { sort: 'name', dir: 'asc', page: '1', pageSize: '25' }
    );

    // Call API endpoint
    const rApi = req('/api/v1/companies?sort=name&dir=asc&page=1&pageSize=25', { token: tokenA });
    const resApi = await getCompanies(rApi);
    assert.equal(resApi.status, 200);
    const apiJson = await resApi.json();

    assert.equal(apiJson.ok, true);
    assert.equal(apiJson.data?.total, webResult.total);
    assert.equal(apiJson.data?.page, webResult.page);
    assert.equal(apiJson.data?.pageSize, webResult.pageSize);
    assert.equal(apiJson.data?.items?.length, webResult.items.length);

    // Compare first 5 item IDs and names
    for (let i = 0; i < Math.min(5, webResult.items.length); i++) {
      assert.equal(apiJson.data.items[i].id, webResult.items[i].id);
      assert.equal(apiJson.data.items[i].name, webResult.items[i].name);
    }
  });
});
