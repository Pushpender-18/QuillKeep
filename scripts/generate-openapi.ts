import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Bearer Auth Scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase JWT access token passed as Bearer <token>',
});

// Common Error Schema
const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    ok: z.literal(false).openapi({ example: false }),
    error: z.object({
      code: z.enum([
        'validation_error',
        'not_found',
        'forbidden',
        'duplicate_name',
        'archived_company',
        'date_required',
        'past_date',
        'confirm_mismatch',
        'too_many',
        'timeout',
        'unauthenticated',
        'account_inactive',
        'server_error',
      ]).openapi({ example: 'validation_error' }),
      message: z.string().openapi({ example: 'Invalid input data provided.' }),
      fields: z.record(z.string(), z.string()).optional().openapi({
        example: { name: 'Company name is required' },
      }),
      details: z.record(z.string(), z.any()).optional().openapi({
        example: { existingCompanyId: '51cff435-97fd-449a-929d-cbeb0352b205', existingName: 'Acme Corp', existingIsArchived: false },
      }),
    }),
  })
);

function successResponse<T extends z.ZodTypeAny>(dataSchema: T, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          ok: z.literal(true).openapi({ example: true }),
          data: dataSchema,
        }),
      },
    },
  };
}

const commonErrorResponses = {
  401: {
    description: 'Unauthenticated - missing or invalid Bearer token',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
        example: { ok: false, error: { code: 'unauthenticated', message: 'Missing or invalid Authorization Bearer header' } },
      },
    },
  },
  403: {
    description: 'Forbidden or account inactive',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
        example: { ok: false, error: { code: 'account_inactive', message: 'Account is inactive or disabled' } },
      },
    },
  },
  400: {
    description: 'Validation or business logic error',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
        example: { ok: false, error: { code: 'validation_error', message: 'Invalid data', fields: {} } },
      },
    },
  },
  404: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
        example: { ok: false, error: { code: 'not_found', message: 'Resource not found' } },
      },
    },
  },
  500: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
        example: { ok: false, error: { code: 'server_error', message: 'An unexpected server error occurred' } },
      },
    },
  },
};

// 1. GET /api/v1/meta
registry.registerPath({
  method: 'get',
  path: '/api/v1/meta',
  summary: 'API metadata and minimum supported client app version',
  security: [{ bearerAuth: [] }],
  responses: {
    200: successResponse(
      z.object({
        apiVersion: z.number().openapi({ example: 1 }),
        minAppVersion: z.string().openapi({ example: '1.0.0' }),
      }),
      'Metadata info'
    ),
    ...commonErrorResponses,
  },
});

// 2. GET /api/v1/me
registry.registerPath({
  method: 'get',
  path: '/api/v1/me',
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: successResponse(
      z.object({
        id: z.string().uuid().openapi({ example: '51cff435-97fd-449a-929d-cbeb0352b205' }),
        fullName: z.string().openapi({ example: 'Pushpender' }),
        email: z.string().email().openapi({ example: 'pushpender@ausmi.com' }),
        isActive: z.boolean().openapi({ example: true }),
        createdAt: z.string().datetime().openapi({ example: '2026-10-10T18:19:16.000Z' }),
      }),
      'Current user profile'
    ),
    ...commonErrorResponses,
  },
});

// 3. GET /api/v1/lookups
registry.registerPath({
  method: 'get',
  path: '/api/v1/lookups',
  summary: 'Get ranked industries, states, active profiles, and active custom field definitions',
  security: [{ bearerAuth: [] }],
  responses: {
    200: successResponse(
      z.object({
        industries: z.array(
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            isActive: z.boolean(),
          })
        ),
        states: z.array(z.object({ id: z.string().uuid(), name: z.string(), isActive: z.boolean() })),
        profiles: z.array(z.object({ id: z.string().uuid(), fullName: z.string(), email: z.string() })),
        customFields: z.array(
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            fieldType: z.enum(['text', 'number', 'date', 'dropdown']),
            options: z.array(z.string()).nullable(),
            isActive: z.boolean(),
          })
        ),
      }),
      'Lookups payload'
    ),
    ...commonErrorResponses,
  },
});

// 4. GET & POST /api/v1/companies
registry.registerPath({
  method: 'get',
  path: '/api/v1/companies',
  summary: 'List companies with sorting, pagination, and multi-field filters',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'view', in: 'query', schema: { type: 'string', enum: ['active', 'archived', 'all'], default: 'active' } },
    { name: 'scope', in: 'query', schema: { type: 'string', enum: ['my', 'all'], default: 'my' } },
    { name: 'q', in: 'query', schema: { type: 'string' } },
    { name: 'status', in: 'query', schema: { type: 'string' } },
    { name: 'state', in: 'query', schema: { type: 'string' } },
    { name: 'industry', in: 'query', schema: { type: 'string' } },
    { name: 'assigned', in: 'query', schema: { type: 'string' } },
    { name: 'priority', in: 'query', schema: { type: 'string' } },
    { name: 'location', in: 'query', schema: { type: 'string' } },
    { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'last_contact', 'priority'], default: 'name' } },
    { name: 'dir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
    { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } },
  ],
  responses: {
    200: successResponse(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            status: z.string(),
            priority: z.string(),
            industry: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
            state: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
            location: z.string().nullable(),
            assignee: z.object({ id: z.string().uuid(), fullName: z.string(), isActive: z.boolean() }).nullable(),
            lastContactedAt: z.string().datetime().nullable(),
            isArchived: z.boolean(),
            archiveReason: z.string().nullable(),
            primaryContact: z
              .object({
                name: z.string(),
                email: z.string().nullable(),
                phone: z.string().nullable(),
              })
              .nullable(),
          })
        ),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
      }),
      'Paginated list of companies'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies',
  summary: 'Create a new company',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            industryId: z.string().uuid().nullable().optional(),
            stateId: z.string().uuid().nullable().optional(),
            location: z.string().nullable().optional(),
            priority: z.enum(['low', 'medium', 'high']).default('medium').optional(),
            assignedTo: z.string().uuid().nullable().optional(),
            contactName: z.string().nullable().optional(),
            contactEmail: z.string().email().nullable().optional(),
            contactPhone: z.string().nullable().optional(),
            initialStatus: z.enum(['new', 'contacted', 'not_interested', 'contact_later', 'meeting_scheduled']).optional(),
            dueAt: z.string().datetime().nullable().optional(),
            reminderType: z.enum(['callback', 'meeting', 'missed_call', 'manual']).nullable().optional(),
            note: z.string().nullable().optional(),
            customFields: z.record(z.string(), z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: successResponse(
      z.object({ id: z.string().uuid(), companyId: z.string().uuid() }),
      'Company created successfully'
    ),
    ...commonErrorResponses,
  },
});

// 5. GET /api/v1/companies/ids
registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/ids',
  summary: 'Get matching company IDs capped at 500 for select-all-matching',
  security: [{ bearerAuth: [] }],
  responses: {
    200: successResponse(
      z.object({
        ids: z.array(z.string().uuid()),
        totalCount: z.number(),
        hasMoreThan500: z.boolean(),
      }),
      'Matching company IDs'
    ),
    ...commonErrorResponses,
  },
});

// 6. GET & PATCH /api/v1/companies/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/{id}',
  summary: 'Get single company details with contacts and custom fields',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        status: z.string(),
        priority: z.string(),
        industry: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
        state: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
        location: z.string().nullable(),
        assignee: z.object({ id: z.string().uuid(), fullName: z.string(), isActive: z.boolean() }).nullable(),
        lastContactedAt: z.string().datetime().nullable(),
        isArchived: z.boolean(),
        archiveReason: z.string().nullable(),
        primaryContact: z
          .object({
            name: z.string(),
            email: z.string().nullable(),
            phone: z.string().nullable(),
          })
          .nullable(),
        createdAt: z.string().datetime().nullable(),
        contacts: z.array(
          z.object({
            id: z.string().uuid(),
            companyId: z.string().uuid(),
            name: z.string(),
            jobTitle: z.string().nullable(),
            email: z.string().nullable(),
            phone: z.string().nullable(),
            isPrimary: z.boolean(),
            createdAt: z.string().datetime().nullable(),
          })
        ),
        customFields: z.record(z.string(), z.any()).optional(),
      }),
      'Company details'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/companies/{id}',
  summary: 'Update company details',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            industryId: z.string().uuid().nullable().optional(),
            stateId: z.string().uuid().nullable().optional(),
            location: z.string().nullable().optional(),
            priority: z.enum(['low', 'medium', 'high']).optional(),
            assignedTo: z.string().uuid().nullable().optional(),
            customFields: z.record(z.string(), z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean(), id: z.string().uuid() }), 'Company updated'),
    ...commonErrorResponses,
  },
});

// 7. POST /api/v1/companies/{id}/status
registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/{id}/status',
  summary: 'Change status of a company',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(['new', 'contacted', 'not_interested', 'contact_later', 'meeting_scheduled']),
            dueAt: z.string().datetime().nullable().optional(),
            reminderType: z.enum(['callback', 'meeting', 'missed_call', 'manual']).nullable().optional(),
            note: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        status: z.string(),
        priority: z.string(),
        industry: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
        state: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
        location: z.string().nullable(),
        assignee: z.object({ id: z.string().uuid(), fullName: z.string(), isActive: z.boolean() }).nullable(),
        lastContactedAt: z.string().datetime().nullable(),
        isArchived: z.boolean(),
        archiveReason: z.string().nullable(),
        primaryContact: z
          .object({
            name: z.string(),
            email: z.string().nullable(),
            phone: z.string().nullable(),
          })
          .nullable(),
        createdAt: z.string().datetime().nullable(),
        contacts: z.array(
          z.object({
            id: z.string().uuid(),
            companyId: z.string().uuid(),
            name: z.string(),
            jobTitle: z.string().nullable(),
            email: z.string().nullable(),
            phone: z.string().nullable(),
            isPrimary: z.boolean(),
            createdAt: z.string().datetime().nullable(),
          })
        ),
        customFields: z.record(z.string(), z.any()).optional(),
      }),
      'Updated company'
    ),
    ...commonErrorResponses,
  },
});

// 8. Bulk Company Operations
registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/status',
  summary: 'Bulk change status for up to 500 companies',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
            status: z.enum(['new', 'contacted', 'not_interested', 'contact_later', 'meeting_scheduled']),
            dueAt: z.string().datetime().nullable().optional(),
            reminderType: z.enum(['callback', 'meeting', 'missed_call', 'manual']).nullable().optional(),
            note: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({ updatedCount: z.number(), skippedCount: z.number() }),
      'Bulk status updated'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/reassign',
  summary: 'Bulk reassign companies to a teammate',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
            newAssignedTo: z.string().uuid().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({ updatedCount: z.number(), skippedCount: z.number() }),
      'Bulk reassign completed'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/archive',
  summary: 'Bulk or single archive companies',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
            reason: z.string().nullable().optional(),
            note: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ updatedCount: z.number(), skippedCount: z.number() }), 'Archived'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/restore',
  summary: 'Bulk or single restore archived companies',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ updatedCount: z.number(), skippedCount: z.number() }), 'Restored'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/delete-preview',
  summary: 'Preview permanent deletion of archived companies and cascaded counts',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({
        totalCount: z.number(),
        companyNames: z.array(z.string()),
        contactsCount: z.number(),
        remarksCount: z.number(),
        remindersCount: z.number(),
        historyCount: z.number(),
        validIds: z.array(z.string().uuid()),
        skippedCount: z.number(),
      }),
      'Delete preview'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/delete',
  summary: 'Permanently delete archived companies (server-side confirmText verification)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).min(1).max(500),
            confirmText: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({ deletedCount: z.number(), skippedCount: z.number() }),
      'Companies permanently deleted'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/export',
  summary: 'Export companies in CSV or XLSX format',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx'], default: 'csv' } },
    { name: 'exportScope', in: 'query', schema: { type: 'string', enum: ['current', 'selected', 'all_active'] } },
    { name: 'selectedIds', in: 'query', schema: { type: 'string' } },
    { name: 'includeArchived', in: 'query', schema: { type: 'boolean' } },
  ],
  responses: {
    200: {
      description: 'Export file stream (text/csv or spreadsheetml)',
      content: {
        'text/csv': { schema: { type: 'string', format: 'binary' } },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } },
      },
    },
    ...commonErrorResponses,
  },
});

// 9. Contacts Endpoints
registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/{id}/contacts',
  summary: 'Add contact to company',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            jobTitle: z.string().nullable().optional(),
            email: z.string().email().nullable().optional(),
            phone: z.string().nullable().optional(),
            isPrimary: z.boolean().default(false).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: successResponse(z.object({ id: z.string().uuid(), contactId: z.string().uuid() }), 'Contact created'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/contacts/{id}',
  summary: 'Update contact details',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            jobTitle: z.string().nullable().optional(),
            email: z.string().email().nullable().optional(),
            phone: z.string().nullable().optional(),
            isPrimary: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean(), id: z.string().uuid() }), 'Contact updated'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/contacts/{id}',
  summary: 'Delete contact',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Contact deleted'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/contacts/{id}/make-primary',
  summary: 'Set contact as primary for its company',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Set as primary contact'),
    ...commonErrorResponses,
  },
});

// 10. Remarks and History
registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/{id}/history',
  summary: 'Get audit history logs for company',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  ],
  responses: {
    200: successResponse(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            companyId: z.string().uuid().optional(),
            action: z.string(),
            actor: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable(),
            oldValue: z.string().nullable(),
            newValue: z.string().nullable(),
            details: z.record(z.string(), z.any()),
            createdAt: z.string().datetime().nullable(),
            oldAssignee: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable().optional(),
            newAssignee: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable().optional(),
          })
        ),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
      }),
      'History logs'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/{id}/remarks',
  summary: 'Get remarks for company (page 20, newest first)',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
    { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
  ],
  responses: {
    200: successResponse(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            companyId: z.string().uuid(),
            authorId: z.string().uuid(),
            authorName: z.string(),
            authorEmail: z.string(),
            authorIsActive: z.boolean(),
            body: z.string(),
            mentions: z.array(z.string().uuid()),
            editedAt: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
          })
        ),
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
      }),
      'Company remarks'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/companies/{id}/remarks',
  summary: 'Post a remark on a company (with @mentions)',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            body: z.string().min(1).max(5000),
            mentionIds: z.array(z.string().uuid()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: successResponse(z.object({ id: z.string().uuid(), remarkId: z.string().uuid() }), 'Remark created'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/remarks/{id}',
  summary: 'Edit a remark (author only)',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            body: z.string().min(1).max(5000),
            mentionIds: z.array(z.string().uuid()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean(), id: z.string().uuid() }), 'Remark updated'),
    ...commonErrorResponses,
  },
});

// 11. Reminders
registry.registerPath({
  method: 'get',
  path: '/api/v1/reminders',
  summary: 'List reminders (scope, day, month, completed window)',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'scope', in: 'query', schema: { type: 'string', enum: ['my', 'all'], default: 'my' } },
    { name: 'day', in: 'query', schema: { type: 'string', example: '2026-10-25' } },
    { name: 'month', in: 'query', schema: { type: 'string', example: '2026-10' } },
    { name: 'completedWindow', in: 'query', schema: { type: 'boolean' } },
  ],
  responses: {
    200: successResponse(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            companyId: z.string().uuid(),
            companyName: z.string(),
            companyIsArchived: z.boolean(),
            assignedTo: z.string().uuid(),
            assigneeName: z.string(),
            assigneeEmail: z.string(),
            type: z.enum(['callback', 'missed_call', 'meeting', 'manual']),
            source: z.string(),
            dueAt: z.string().datetime(),
            note: z.string().nullable(),
            completedAt: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
            isOverdue: z.boolean(),
          })
        ).optional(),
        days: z.record(z.string(), z.object({ hasOpen: z.boolean(), hasOverdue: z.boolean() })).optional(),
      }),
      'Reminders list or monthly map'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/reminders',
  summary: 'Create a new reminder',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            companyId: z.string().uuid(),
            type: z.enum(['callback', 'missed_call', 'meeting', 'manual']),
            dueAt: z.string().datetime().optional(),
            dateStr: z.string().optional(),
            timeStr: z.string().optional(),
            assignedTo: z.string().uuid(),
            note: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: successResponse(z.object({ id: z.string().uuid(), reminderId: z.string().uuid() }), 'Reminder created'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/companies/{id}/reminders',
  summary: 'Get reminders for a specific company',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ items: z.array(z.any()) }), 'Company reminders'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/reminders/{id}',
  summary: 'Update or reschedule a reminder',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            type: z.enum(['callback', 'missed_call', 'meeting', 'manual']).optional(),
            dueAt: z.string().datetime().optional(),
            dateStr: z.string().optional(),
            timeStr: z.string().optional(),
            assignedTo: z.string().uuid().optional(),
            note: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean(), id: z.string().uuid() }), 'Reminder updated'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/reminders/{id}',
  summary: 'Delete a reminder',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Reminder deleted'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/reminders/{id}/complete',
  summary: 'Mark reminder as completed',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Completed'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/reminders/{id}/uncomplete',
  summary: 'Unmark completed reminder',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Uncompleted'),
    ...commonErrorResponses,
  },
});

// 12. Notifications
registry.registerPath({
  method: 'get',
  path: '/api/v1/notifications',
  summary: 'Get user notifications',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 30 } }],
  responses: {
    200: successResponse(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            userId: z.string().uuid(),
            type: z.enum(['mention', 'assigned']),
            companyId: z.string().uuid().nullable(),
            remarkId: z.string().uuid().nullable(),
            message: z.string(),
            readAt: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
          })
        ),
        unreadCount: z.number(),
      }),
      'Notifications'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/notifications/unread-count',
  summary: 'Get badge unread count',
  security: [{ bearerAuth: [] }],
  responses: {
    200: successResponse(z.object({ unreadCount: z.number() }), 'Unread notification count'),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/notifications/read',
  summary: 'Mark notifications as read ({ids} or {all: true})',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.string().uuid()).optional(),
            all: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean() }), 'Marked read'),
    ...commonErrorResponses,
  },
});

// 13. Dashboard & Search
registry.registerPath({
  method: 'get',
  path: '/api/v1/dashboard',
  summary: 'Get dashboard KPIs, timeseries, reminders, and team activity',
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: 'range', in: 'query', schema: { type: 'string', enum: ['today', '7d', '30d', 'month', 'lastmonth', 'custom'], default: '7d' } },
    { name: 'from', in: 'query', schema: { type: 'string', example: '2026-10-01' } },
    { name: 'to', in: 'query', schema: { type: 'string', example: '2026-10-25' } },
    { name: 'scope', in: 'query', schema: { type: 'string', enum: ['my', 'all'], default: 'my' } },
  ],
  responses: {
    200: successResponse(
      z.object({
        range: z.object({
          preset: z.string(),
          from: z.string().datetime(),
          to: z.string().datetime(),
          prevFrom: z.string().datetime(),
          prevTo: z.string().datetime(),
          days: z.number(),
        }),
        stats: z.object({ contacted: z.number(), meetings: z.number(), conversionRate: z.number() }),
        previousStats: z.object({ contacted: z.number(), meetings: z.number(), conversionRate: z.number() }),
        series: z.array(z.object({ day: z.string(), outreaches: z.number() })),
        upcomingReminders: z.array(z.any()),
        overdueCount: z.number(),
        team: z.array(z.any()).nullable(),
      }),
      'Dashboard data'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/search',
  summary: 'Global spotlight search across companies, contacts, and remarks',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
  responses: {
    200: successResponse(
      z.object({
        companies: z.array(z.any()),
        contacts: z.array(z.any()),
        remarks: z.array(z.any()),
      }),
      'Global search results'
    ),
    ...commonErrorResponses,
  },
});

// 14. Custom Fields
registry.registerPath({
  method: 'post',
  path: '/api/v1/custom-fields',
  summary: 'Create custom field definition',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            fieldType: z.enum(['text', 'number', 'date', 'dropdown']),
            options: z.array(z.string()).nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: successResponse(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        fieldType: z.string(),
        options: z.array(z.string()).nullable(),
        isActive: z.boolean(),
      }),
      'Custom field created'
    ),
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/custom-fields/{id}',
  summary: 'Update custom field definition (rename, add dropdown options, toggle active)',
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            newOptions: z.array(z.string()).optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(z.object({ success: z.boolean(), id: z.string().uuid() }), 'Custom field updated'),
    ...commonErrorResponses,
  },
});

// 15. GET /api/v1/openapi.json
registry.registerPath({
  method: 'get',
  path: '/api/v1/openapi.json',
  summary: 'Fetch the OpenAPI 3.1 specification for the QuillKeep Mobile API',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'OpenAPI 3.1 JSON document',
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    ...commonErrorResponses,
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);
const openApiDoc = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'QuillKeep Mobile API',
    version: '1.0.0',
    description: 'Versioned JSON API for the native Android client application.',
  },
  servers: [
    {
      url: '/',
      description: 'Default server relative URL',
    },
  ],
});

const docsDir = path.resolve(process.cwd(), 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const outPath = path.join(docsDir, 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(openApiDoc, null, 2), 'utf-8');
console.log(`Generated OpenAPI 3.1.0 spec at: ${outPath}`);
