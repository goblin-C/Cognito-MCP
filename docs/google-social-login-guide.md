# Google Social Login Setup Guide

## Overview

This guide walks you through setting up Google as a social identity provider for
your AWS Cognito User Pool. After following these steps, users will be able to
sign in with their Google account alongside the standard email/password flow.

The `auth.configure-provider` tool generates a CloudFormation template with
placeholder credentials. This guide shows you how to obtain real credentials
and where to substitute them.

---

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)
- A deployed Cognito User Pool with a domain configured
  (use `auth.setup-basic` or `auth.configure-pool` + `auth.configure-domain`)

---

## Step 1 — Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project selector (top-left) and choose **New Project**
3. Enter a project name and click **Create**
4. Select your new project from the project selector

---

## Step 2 — Configure the OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**
2. Select **External** user type (or **Internal** if you have Google Workspace
   and want to restrict access to your org)
3. Fill in the required fields:
   - **App name**: Your application name
   - **User support email**: Your email address
   - **Authorized domains**: Add `amazoncognito.com`
   - **Developer contact email**: Your email address
4. Click **Save and Continue**
5. On the **Scopes** screen, add:
   - `email`
   - `profile`
   - `openid`
6. Click **Save and Continue**
7. If in testing mode, add test users on the **Test users** screen
8. Click **Save and Continue** → **Back to Dashboard**

---

## Step 3 — Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Set **Application type** to **Web application**
4. Set **Name** to something descriptive (e.g. "Cognito Social Login")
5. Under **Authorized JavaScript origins**, add:
   ```
   https://<your-domain-prefix>.auth.<region>.amazoncognito.com
   ```
6. Under **Authorized redirect URIs**, add:
   ```
   https://<your-domain-prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```
   Replace `<your-domain-prefix>` with the domain you configured in Cognito and
   `<region>` with your AWS region (e.g. `us-east-1`).
7. Click **Create**
8. Copy the **Client ID** and **Client Secret** — you'll need these in the next step

---

## Step 4 — Update Your CloudFormation Template

In the generated `cognito-identity-provider.yaml` (from `auth.configure-provider`),
find and replace the two placeholder values:

| Placeholder                  | Replace with                        |
|------------------------------|-------------------------------------|
| `YOUR_GOOGLE_CLIENT_ID`      | Your Google OAuth Client ID         |
| `YOUR_GOOGLE_CLIENT_SECRET`  | Your Google OAuth Client Secret     |

The relevant section looks like this:

```yaml
ProviderDetails:
  client_id: YOUR_GOOGLE_CLIENT_ID        # ← replace
  client_secret: YOUR_GOOGLE_CLIENT_SECRET # ← replace
  authorize_scopes: openid email profile
```

---

## Step 5 — Update Your App Client

Your App Client's `SupportedIdentityProviders` must include `"Google"` in
addition to `"COGNITO"`. You have two options:

**Option A** — Use `auth.modify-config` to update an existing client template:
```json
{
  "existingYaml": "<your client YAML>",
  "changes": [
    {
      "path": "Resources.CognitoUserPoolClient.Properties.SupportedIdentityProviders",
      "value": ["COGNITO", "Google"]
    }
  ]
}
```

**Option B** — Regenerate with `auth.configure-client`, setting
`SupportedIdentityProviders` to `["COGNITO", "Google"]`.

---

## Step 6 — Deploy

Deploy the identity provider template **after** your User Pool and Domain
are deployed (the IdP references the pool):

```bash
aws cloudformation deploy \
  --template-file cognito-identity-provider.yaml \
  --stack-name my-app-google-idp \
  --region us-east-1
```

Then redeploy your App Client template if you updated
`SupportedIdentityProviders`.

---

## Step 7 — Test

1. Open your Cognito hosted UI:
   ```
   https://<domain-prefix>.auth.<region>.amazoncognito.com/login?client_id=<client-id>&response_type=code&scope=openid+email+profile&redirect_uri=<callback-url>
   ```
2. You should see a **"Continue with Google"** button
3. Click it and authenticate with a Google account
4. After consent, you'll be redirected to your callback URL with an
   authorization code in the query string

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `redirect_uri_mismatch` error from Google | The redirect URI in Google Console doesn't match Cognito's | Set it to exactly: `https://<prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse` |
| No Google button on hosted UI | App Client missing Google in `SupportedIdentityProviders` | Add `"Google"` to the `SupportedIdentityProviders` array |
| `invalid_client` error | Wrong Client ID or Client Secret | Double-check credentials in Google Console match the template |
| Attribute mapping errors | Cognito pool schema doesn't have the mapped attributes | Ensure `email`, `name`, and `picture` are in the pool's schema (they are by default) |
| Google consent screen shows "unverified app" | App is still in testing mode in Google Console | Add test users, or submit the app for Google verification for production use |
