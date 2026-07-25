# Firebase production setup for Abs-Track

Required before live deploy with Google Sign-In and meal photo uploads.

## 1. Create Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. **Add project** → **`abstrack-prod`** (already created).
3. **Recommendation:** Use a **separate** project from any GCP project where billing is enabled for Gemini — free-tier Gemini is tied to the project.

## 2. Register web app

1. Project overview → **Web** (`</>`).
2. App nickname: `Abs-Track PWA`.
3. Copy the `firebaseConfig` values into env:

| Firebase console field | Env variable |
|------------------------|--------------|
| apiKey | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| authDomain | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| projectId | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| storageBucket | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| messagingSenderId | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| appId | `NEXT_PUBLIC_FIREBASE_APP_ID` |

Paste into:

- `web/.env.production.local` (local build — see `deploy/env.production.example`)
- `/opt/fitness-coach/web/.env.local` on the VM (runtime)

## 3. Enable Google Sign-In

1. **Build** → **Authentication** → **Sign-in method**.
2. Enable **Google**.
3. Set support email.
4. **Settings** → **Authorized domains** → add:
   - `abstrack.duckdns.org`
   - `localhost`
   - `abstrack-prod.firebaseapp.com` (added automatically)

## 4. Enable Storage (meal photos)

1. **Build** → **Storage** → **Get started**.
2. Start in **production mode** (adjust rules below for pilot).
3. Minimal rules for authenticated uploads (paths match [`web/lib/firebase/storage-upload.ts`](../web/lib/firebase/storage-upload.ts)):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /check-ins/{memberId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For stricter pilot rules, restrict writes to the signed-in user's member record once member IDs are mapped to Firebase UIDs.

## 5. Service account (API token verification)

Server routes verify Firebase ID tokens via Admin SDK.

1. **Project settings** → **Service accounts** → **Generate new private key**.
2. From the downloaded JSON:

| JSON field | Env variable |
|------------|--------------|
| project_id | `FIREBASE_PROJECT_ID` |
| client_email | `FIREBASE_CLIENT_EMAIL` |
| private_key | `FIREBASE_PRIVATE_KEY` |

For `.env` files, put the private key on one line with `\n` escapes:

```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

On the VM, you may use a literal multiline value in `/opt/fitness-coach/web/.env.local` instead.

**Never commit** the service account JSON or `.env.production.local`.

### Import script (recommended)

From project root, point at the JSON file you downloaded from Firebase Console:

```powershell
deploy/import-firebase-admin.ps1 -KeyJsonPath "C:\path\to\abstrack-prod-firebase-adminsdk-xxxxx.json"
```

This updates `web/.env.local` and `web/.env.production.local` with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. You do **not** need to paste the key in chat.

## 6. Coach role assignment

Set coach emails in env (comma-separated):

```bash
COACH_EMAILS=helna@abstrack.com,your-coach@gmail.com
```

First Google sign-in with a listed email receives the `coach` role; all others become `member` (auto-provisioned in Postgres).

## 7. Rebuild after env changes

`NEXT_PUBLIC_*` variables are embedded at **build time**. After changing Firebase client config:

```powershell
deploy/deploy-app.ps1 -Remote ubuntu@... -KeyPath ... -EnvFile web\.env.production.local
```

Admin SDK vars (`FIREBASE_PROJECT_ID`, etc.) are read at **runtime** on the VM — edit `/opt/fitness-coach/web/.env.local` and:

```powershell
deploy/deploy-app.ps1 ... -RestartOnly
```

## 8. Checklist

- [x] Firebase project created (`abstrack-prod`)
- [x] Web app registered, client config in `web/.env.local`
- [x] Google Sign-In enabled (per user)
- [ ] `abstrack.duckdns.org` in authorized domains (needed for Oracle deploy; `localhost` for local dev)
- [x] Storage enabled with rules (`check-ins/{memberId}/{fileName}`)
- [x] Service account key → `deploy/import-firebase-admin.ps1` (see step 5)
- [x] `COACH_EMAILS` set (`helna@abstrack.com`, `bluebellsx@gmail.com`, `pujack.win@gmail.com`)
- [x] `web/.env.production.local` — client + admin keys filled
- [ ] VM `/opt/fitness-coach/web/.env.local` filled (Oracle deploy)
- [ ] `deploy-app.ps1` run successfully

### Verify locally

```powershell
cd web
npm run dev
```

1. Open http://localhost:3010/login → **Sign in with Google**
2. Coach email in `COACH_EMAILS` → should land on `/coach`
3. Other Google account → `/member`
4. Member **Check-in** → upload meal photo (tests Storage)
