# QuillKeep Android Native API Documentation (v1)

This documentation provides the complete integration specification for the native Android application communicating with the QuillKeep v1 Mobile API.

---

## 1. Authentication Flow

The Android application authenticates via **Supabase Auth** directly on the client, and sends the acquired access token as a standard Bearer token in the `Authorization` header to the backend API.

### 1.1 Sign-In Flow
1. **Client Sign-In**: The Android app initializes the Supabase Kotlin/Java SDK using:
   - `SUPABASE_URL`: e.g. `https://<project-ref>.supabase.co`
   - `SUPABASE_ANON_KEY`: Supabase Public Anon Key
2. The user signs in with email and password via `supabase.auth.signInWith(Password)`:
   ```kotlin
   val session = supabase.auth.signInWith(Password) {
       email = userEmail
       password = userPassword
   }
   val accessToken = session.accessToken
   ```
3. **API Requests**: Every HTTP request made to `/api/v1/*` must include the header:
   ```http
   Authorization: Bearer <accessToken>
   ```
4. **Token Refresh**: When the access token expires, the client uses `supabase.auth.refreshCurrentSession()` to obtain a fresh access token before invoking API endpoints.

### 1.2 Cookie Policy
- **No Cookies**: The API **never** accepts or reads cookies on `/api/v1/*`. Requests relying on session cookies will be rejected with `401 {"code": "unauthenticated"}`.
- Every API response includes `Cache-Control: no-store` and `X-Api-Version: 1`.
- Tokens are never logged server-side.

---

## 2. API Response & Error Conventions

### 2.1 Envelopes

All responses are strictly formatted as JSON.

#### Success Envelope (`200` / `201`)
```json
{
  "ok": true,
  "data": { ... }
}
```

#### Failure Envelope (`4xx` / `5xx`)
```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Company name is required",
    "fields": {
      "name": "Company name is required"
    }
  }
}
```

### 2.2 Error Codes Reference

| Error Code | HTTP Status | Description & Trigger Conditions |
|---|---|---|
| `unauthenticated` | 401 | Missing, malformed, or expired Bearer token. |
| `account_inactive` | 403 | Authenticated user profile has `isActive = false` or does not exist. |
| `forbidden` | 403 | Attempting an action forbidden to the user (e.g. editing another author's remark). |
| `not_found` | 404 | Target company, contact, reminder, or remark does not exist. |
| `duplicate_name` | 409 | A company or custom field with this name already exists (case-insensitive, trimmed). |
| `archived_company` | 400 | Attempted mutation (status change, contact modification, reminder creation, remark addition) on an archived company. |
| `date_required` | 400 | Transitioning to `contact_later` or `meeting_scheduled` without a mandatory `dueAt` / reminder date. |
| `past_date` | 400 | Providing a reminder or follow-up date/time that is in the past. |
| `confirm_mismatch` | 400 | Delete confirmation text mismatch (single company requires exact company name; multiple requires `DELETE`). |
| `too_many` | 400 | Bulk operation exceeded the hard ceiling of 500 company IDs. |
| `validation_error` | 400 | Schema validation failure; field-specific details provided in `error.fields`. |
| `timeout` | 504 | Database transaction timeout (> 30s). |
| `server_error` | 500 | Unhandled internal error. No stack traces or SQL syntax are ever exposed. |

---

## 3. Date & Time Conventions

1. **Storage & Transmission (Server)**:
   - All timestamps transmitted in API request bodies and response JSON are formatted as **ISO-8601 UTC with explicit "Z" timezone indicator**:
     `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g. `2026-10-25T11:20:00.000Z`).
   - The server **never** formats dates into display strings (such as "Today, 3 Oct").
2. **Display (Client)**:
   - The native Android client must parse the UTC ISO timestamp and format it for display in the company's operational timezone: **Asia/Kolkata (IST, UTC+05:30)**.
3. **Query Parameters**:
   - Day queries accept `YYYY-MM-DD` (e.g. `?day=2026-10-25`).
   - Month queries accept `YYYY-MM` (e.g. `?month=2026-10`).
   - In reminder creation, client can supply either `dueAt` (ISO-8601 string) or pair of `dateStr` (`YYYY-MM-DD`) and `timeStr` (`HH:mm`).

---

## 4. Supabase Realtime Setup (Android Client)

The Android application subscribes to Supabase Realtime directly over WebSockets using the Supabase client library. **No direct database credentials or passwords are used.** The client uses the **Anon Public Key** combined with the user's active **JWT**.

### 4.1 Realtime Notifications
To receive live push alerts when the user is mentioned in a remark or assigned a company:

```kotlin
val myUserId = currentUser.id

val channel = supabase.channel("user-notifications") {
    // Filter strictly to the authenticated user's own rows
    postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
        table = "notifications"
        filter = "user_id=eq.$myUserId"
    }
}

channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
    table = "notifications"
    filter = "user_id=eq.$myUserId"
}.collect { change ->
    val newNotification = change.decodeRecord<NotificationDto>()
    showSystemNotification(newNotification)
}

supabase.subscribe(channel)
```

### 4.2 Company Presence Channel
To show real-time teammate presence when viewing a specific company detail screen:

```kotlin
val companyId = "..."
val presenceChannel = supabase.channel("company:$companyId")

presenceChannel.presenceChangeFlow().collect { presenceEvent ->
    val activeTeammates = presenceChannel.presenceList<UserPresenceDto>()
    updateTeammateAvatars(activeTeammates)
}

presenceChannel.subscribe { status ->
    if (status == ChannelStatus.SUBSCRIBED) {
        presenceChannel.track(
            UserPresenceDto(
                userId = myUserId,
                fullName = myUserName,
                onlineAt = Instant.now().toString()
            )
        )
    }
}
```

---

## 5. Endpoints Summary

All endpoints are hosted at `/api/v1/*` and require `Authorization: Bearer <token>`.

### Metadata & User
- `GET /api/v1/meta` - API version and `minAppVersion`.
- `GET /api/v1/me` - Authenticated user profile.
- `GET /api/v1/lookups` - Active industries (ranked), states, active teammates, and custom field definitions.

### Companies
- `GET /api/v1/companies` - List companies (params: `view`, `scope`, `q`, `status`, `state`, `industry`, `assigned`, `priority`, `location`, `cf.<fieldId>`, `sort`, `dir`, `page`, `pageSize`). Returns `{ items, total, page, pageSize }` (25 per page by default).
- `GET /api/v1/companies/ids` - Matching company IDs capped at 500 for select-all-matching.
- `GET /api/v1/companies/{id}` - Complete details with contacts and custom field values.
- `POST /api/v1/companies` - Create company with optional primary contact and initial status.
- `PATCH /api/v1/companies/{id}` - Update company details and custom fields.
- `POST /api/v1/companies/{id}/status` - Update status via `change_company_status`.
- `POST /api/v1/companies/status` - Bulk change status (max 500).
- `POST /api/v1/companies/reassign` - Bulk reassign companies (max 500).
- `POST /api/v1/companies/archive` - Bulk or single archive.
- `POST /api/v1/companies/restore` - Bulk or single restore.
- `POST /api/v1/companies/delete-preview` - Preview deletion item counts (archived companies only).
- `POST /api/v1/companies/delete` - Permanently delete archived companies (server-side `confirmText` check).
- `GET /api/v1/companies/export` - Export matched companies (`?format=csv` or `?format=xlsx`).

### Contacts
- `POST /api/v1/companies/{id}/contacts` - Create contact for company.
- `PATCH /api/v1/contacts/{id}` - Update contact.
- `DELETE /api/v1/contacts/{id}` - Delete contact.
- `POST /api/v1/contacts/{id}/make-primary` - Mark as primary contact.

### Remarks & Audit History
- `GET /api/v1/companies/{id}/history` - Historical change log.
- `GET /api/v1/companies/{id}/remarks` - Paginated remarks (newest first).
- `POST /api/v1/companies/{id}/remarks` - Create remark with `@FullName` mentions.
- `PATCH /api/v1/remarks/{id}` - Edit remark body and mentions (author only).

### Reminders
- `GET /api/v1/reminders` - List reminders (`scope=my|all`, `day=YYYY-MM-DD`, `month=YYYY-MM`, `completedWindow=true`).
- `GET /api/v1/companies/{id}/reminders` - Company reminders.
- `POST /api/v1/reminders` - Schedule reminder.
- `PATCH /api/v1/reminders/{id}` - Reschedule or update reminder.
- `POST /api/v1/reminders/{id}/complete` - Mark reminder completed.
- `POST /api/v1/reminders/{id}/uncomplete` - Reopen completed reminder.
- `DELETE /api/v1/reminders/{id}` - Delete reminder.

### Notifications
- `GET /api/v1/notifications` - Paginated notification list.
- `GET /api/v1/notifications/unread-count` - Unread badge count.
- `POST /api/v1/notifications/read` - Mark specific notification IDs or `{ all: true }` as read.

### Dashboard & Search
- `GET /api/v1/dashboard` - KPIs, previous period comparisons, timeseries charts, upcoming reminders, and teammate stats (`scope=all`).
- `GET /api/v1/search` - Global spotlight search across companies, contacts, and remarks.

### OpenAPI Specification
- `GET /api/v1/openapi.json` - Complete OpenAPI 3.1.0 specification for automated SDK or model generation.
