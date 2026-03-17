import { z } from "zod";
import { buildYaml } from '../utils/helpers.js'

// ─────────────────────────────────────────────
// Rich docs for every configurable field.
// The LLM uses this to answer "what does X do?"
// before the user commits to a value.
// ─────────────────────────────────────────────
const FIELD_DOCS = {
  UserPoolName: {
    summary: "The name of your User Pool.",
    detail: "A descriptive name for the pool. Cannot be changed after creation.",
    example: "my-app-users",
  },
  UserPoolTier: {
    summary: "Feature tier: LITE | ESSENTIALS | PLUS.",
    detail:
      "LITE is the free tier with basic auth. ESSENTIALS adds threat protection. PLUS adds advanced security features like compromised-credential detection. Affects billing.",
    example: "ESSENTIALS",
  },
  DeletionProtection: {
    summary: "Prevents accidental pool deletion.",
    detail:
      "When ACTIVE, the pool cannot be deleted via console or API until protection is removed. Recommended for production.",
    example: "ACTIVE",
  },
  UsernameAttributes: {
    summary: "Let users sign in with email and/or phone instead of a username.",
    detail:
      "Cannot be changed after pool creation. If set, users have no separate 'username' field — their email or phone IS their identifier. Cannot be combined with AliasAttributes.",
    example: ["email"],
  },
  AliasAttributes: {
    summary: "Attributes that can act as aliases for a traditional username.",
    detail:
      "Users still have a username, but can also sign in using any listed alias. Mutually exclusive with UsernameAttributes.",
    example: ["email", "preferred_username"],
  },
  AutoVerifiedAttributes: {
    summary: "Attributes Cognito verifies automatically on sign-up.",
    detail:
      "Cognito sends a verification code to the attribute value. Requires SmsConfiguration for phone_number, or EmailConfiguration for email.",
    example: ["email"],
  },
  MfaConfiguration: {
    summary: "MFA enforcement: OFF | OPTIONAL | ON.",
    detail:
      "OFF disables MFA entirely. OPTIONAL lets users choose. ON forces MFA for all users. Requires EnabledMfas and SmsConfiguration (if SMS) or an email/TOTP setup.",
    example: "OPTIONAL",
  },
  EnabledMfas: {
    summary: "Which MFA methods are available: SMS_MFA | SOFTWARE_TOKEN_MFA | EMAIL_OTP.",
    detail:
      "SMS_MFA requires SnsCallerArn. SOFTWARE_TOKEN_MFA uses authenticator apps (TOTP). EMAIL_OTP sends a one-time code to the user's email. Can enable multiple.",
    example: ["SOFTWARE_TOKEN_MFA", "EMAIL_OTP"],
  },
  PasswordMinimumLength: {
    summary: "Minimum password character count (6–99).",
    detail: "Applies to all user-created and admin-created passwords.",
    example: 12,
  },
  PasswordRequireUppercase: { summary: "Require at least one uppercase letter.", example: true },
  PasswordRequireLowercase: { summary: "Require at least one lowercase letter.", example: true },
  PasswordRequireNumbers: { summary: "Require at least one numeric digit.", example: true },
  PasswordRequireSymbols: {
    summary: "Require at least one symbol (e.g. !@#$).",
    detail: "Symbols include: ^ $ * . [ ] { } ( ) ? - \" ! @ # % & / \\ , > < ' : ; | _ ~ ` + =",
    example: true,
  },
  TemporaryPasswordValidityDays: {
    summary: "Days before an admin-generated temporary password expires (1–365).",
    example: 7,
  },
  AccountRecoveryMechanisms: {
    summary: "How users recover their accounts (email, phone, or admin only).",
    detail:
      "Priority 1 is tried first. 'admin_only' means users cannot self-recover — an admin must reset their password. Cannot combine admin_only with other mechanisms.",
    example: [{ Name: "verified_email", Priority: 1 }],
  },
  AllowAdminCreateUserOnly: {
    summary: "Disable self-registration — only admins can create accounts.",
    detail: "Good for internal tools or invite-only apps. Users receive an invite email/SMS with a temporary password.",
    example: true,
  },
  InviteEmailSubject: { summary: "Subject line for admin-invite emails.", example: "You're invited to MyApp" },
  InviteEmailMessage: {
    summary: "Email body for admin invites. Must contain {username} and {####}.",
    example: "Hello {username}, your temporary password is {####}",
  },
  InviteSmsMessage: {
    summary: "SMS body for admin invites. Must contain {username} and {####}.",
    example: "Your temp password for MyApp: {####}",
  },
  EmailSendingAccount: {
    summary: "COGNITO_DEFAULT (free, limited) or DEVELOPER (your SES account).",
    detail:
      "COGNITO_DEFAULT works out of the box but has low send limits and no custom From address. DEVELOPER requires FromEmailAddress and SourceArn (verified SES identity).",
    example: "DEVELOPER",
  },
  FromEmailAddress: {
    summary: "From address for emails sent by Cognito. Requires DEVELOPER sending account.",
    example: "no-reply@myapp.com",
  },
  ReplyToEmailAddress: { summary: "Reply-to address for Cognito emails.", example: "support@myapp.com" },
  SourceArn: {
    summary: "ARN of your verified SES identity. Required for DEVELOPER sending account.",
    example: "arn:aws:ses:us-east-1:123456789:identity/no-reply@myapp.com",
  },
  EmailVerificationSubject: { summary: "Subject for the verification email sent on sign-up.", example: "Verify your email" },
  EmailVerificationMessage: {
    summary: "Body of the verification email. Must contain {####}.",
    example: "Your verification code is {####}",
  },
  SnsCallerArn: {
    summary: "IAM role ARN that Cognito assumes to send SMS via SNS.",
    detail: "The role must have sns:Publish permission and a trust policy allowing cognito-idp.amazonaws.com to assume it.",
    example: "arn:aws:iam::123456789:role/CognitoSNSRole",
  },
  SnsRegion: { summary: "AWS region for SNS SMS sending. Defaults to the pool's region.", example: "us-east-1" },
  ExternalId: {
    summary: "External ID used in the IAM trust policy for the SNS role. Adds security.",
    example: "my-external-id",
  },
  SmsVerificationMessage: {
    summary: "SMS sent to verify a phone number. Must contain {####}.",
    example: "Your verification code is {####}",
  },
  SmsAuthenticationMessage: {
    summary: "SMS sent for SMS MFA challenge. Must contain {####}.",
    example: "Your MFA code is {####}",
  },
  ChallengeRequiredOnNewDevice: {
    summary: "Require MFA on unrecognized devices even if the device is remembered.",
    example: true,
  },
  DeviceOnlyRememberedOnUserPrompt: {
    summary: "Only remember a device if the user explicitly opts in.",
    detail: "If false, all devices are remembered automatically after first MFA.",
    example: true,
  },
  CaseSensitiveUsername: {
    summary: "Whether usernames are case-sensitive.",
    detail: "Defaults to false (case-insensitive). Cannot be changed after pool creation.",
    example: false,
  },
  AdvancedSecurityMode: {
    summary: "Threat protection: OFF | AUDIT | ENFORCED.",
    detail:
      "AUDIT logs risky sign-ins but takes no action. ENFORCED blocks or requires step-up auth for risky sign-ins. Requires ESSENTIALS or PLUS tier.",
    example: "ENFORCED",
  },
  WebAuthnRelyingPartyID: {
    summary: "Domain for WebAuthn/passkey authentication (e.g. myapp.com).",
    detail: "Must match the effective domain of your app. Required to enable passkey sign-in.",
    example: "myapp.com",
  },
  WebAuthnUserVerification: {
    summary: "Passkey user verification: required | preferred | discouraged.",
    detail: "'required' forces biometric/PIN. 'preferred' uses it when available. 'discouraged' skips it.",
    example: "preferred",
  },
  AttributesRequireVerificationBeforeUpdate: {
    summary: "Force re-verification of email/phone before the update takes effect.",
    detail: "Prevents account hijacking by changing contact details. The old value stays active until the new one is verified.",
    example: ["email"],
  },
  SchemaAttributes: {
    summary: "Custom user attributes added to the pool schema.",
    detail:
      "Names are automatically prefixed with 'custom:'. AttributeDataType is String | Number | DateTime | Boolean. Schema cannot be removed after creation, only added.",
    example: [{ Name: "department", AttributeDataType: "String", Mutable: true }],
  },
  PreSignUp: { summary: "Lambda triggered before user registration. Can validate or auto-confirm users.", example: "arn:aws:lambda:..." },
  PostConfirmation: { summary: "Lambda triggered after user confirms their account.", example: "arn:aws:lambda:..." },
  PreAuthentication: { summary: "Lambda triggered before sign-in. Can block logins.", example: "arn:aws:lambda:..." },
  PostAuthentication: { summary: "Lambda triggered after successful sign-in.", example: "arn:aws:lambda:..." },
  PreTokenGeneration: { summary: "Lambda triggered before tokens are issued. Can add/suppress claims.", example: "arn:aws:lambda:..." },
  CustomMessage: { summary: "Lambda to customize all Cognito-sent messages (email/SMS).", example: "arn:aws:lambda:..." },
  DefineAuthChallenge: { summary: "Lambda to define a custom auth challenge flow.", example: "arn:aws:lambda:..." },
  CreateAuthChallenge: { summary: "Lambda to create the challenge (e.g. generate a CAPTCHA).", example: "arn:aws:lambda:..." },
  VerifyAuthChallengeResponse: { summary: "Lambda to verify the user's challenge response.", example: "arn:aws:lambda:..." },
  UserMigration: { summary: "Lambda to migrate users from a legacy system on first sign-in.", example: "arn:aws:lambda:..." },
  Tags: { summary: "AWS resource tags applied to the User Pool.", example: { Environment: "production", Team: "auth" } },
};

/**
 * Tool: auth.describe-pool
 *
 * Returns detailed documentation for one or more Cognito User Pool
 * configuration fields from the local FIELD_DOCS map.
 *
 * Use this before auth.configure whenever the user asks what a field does
 * or is unsure which option to pick. Do NOT guess — look up the field first.
 */
export function registerUserPoolDescribeTool(server) {
  server.tool(
    "auth.describe-pool",
    `Return detailed documentation for one or more Cognito User Pool configuration fields.
Use this tool BEFORE calling auth.configure whenever the user asks what a field does,
is unsure which option to pick, or you need to present options clearly.
Do NOT guess — look up the field first, then explain it to the user in plain language.`,
    {
      fields: z
        .array(z.string())
        .describe("Field names to look up, e.g. ['MfaConfiguration', 'EnabledMfas']"),
    },
    async ({ fields }) => {
      const results = fields.map((f) => {
        const doc = FIELD_DOCS[f];
        if (!doc) return `**${f}**: No documentation found.`;
        const lines = [`**${f}**: ${doc.summary}`];
        if (doc.detail) lines.push(`  → ${doc.detail}`);
        if (doc.example !== undefined) lines.push(`  Example: \`${JSON.stringify(doc.example)}\``);
        return lines.join("\n");
      });

      return {
        content: [{ type: "text", text: results.join("\n\n") }],
      };
    }
  );
}

/**
 * Tool: auth.configure-pool
 *
 * Collects AWS Cognito User Pool configuration from the developer and returns
 * a CloudFormation YAML string (AWS::Cognito::UserPool).
 *
 * Only fields explicitly provided are included in the output — no defaults
 * or empty values are written to the template.
 *
 * Output: cognito-userpool.yaml
 * Next step: run auth.configure-client, then auth.configure-domain, then auth.plan
 */

export function registerUserPoolConfigTool(server) {
  server.tool(
    "auth.configure-pool",
    "Configure an AWS Cognito User Pool and generate a CloudFormation YAML file",
    {
      // ── Core
      UserPoolName: z.string().describe("Name of the User Pool"),
      UserPoolTier: z.enum(["LITE", "ESSENTIALS", "PLUS"]).optional().describe("User Pool tier"),
      DeletionProtection: z.enum(["ACTIVE", "INACTIVE"]).optional().describe("Prevent accidental deletion"),

      // ── Username / Attributes
      UsernameAttributes: z
        .array(z.enum(["email", "phone_number"]))
        .optional()
        .describe("Allow users to sign in with email and/or phone_number instead of a username"),
      AliasAttributes: z
        .array(z.enum(["email", "phone_number", "preferred_username"]))
        .optional()
        .describe("Attributes that can be used as an alias for the username"),
      AutoVerifiedAttributes: z
        .array(z.enum(["email", "phone_number"]))
        .optional()
        .describe("Attributes to auto-verify on sign-up"),

      // ── MFA
      MfaConfiguration: z
        .enum(["OFF", "ON", "OPTIONAL"])
        .optional()
        .describe("MFA enforcement level"),
      EnabledMfas: z
        .array(z.enum(["SMS_MFA", "SOFTWARE_TOKEN_MFA", "EMAIL_OTP"]))
        .optional()
        .describe("MFA methods to enable (requires MfaConfiguration ON or OPTIONAL)"),

      // ── Password policy
      PasswordMinimumLength: z.number().int().min(6).max(99).optional().describe("Minimum password length"),
      PasswordRequireUppercase: z.boolean().optional().describe("Require uppercase letter in password"),
      PasswordRequireLowercase: z.boolean().optional().describe("Require lowercase letter in password"),
      PasswordRequireNumbers: z.boolean().optional().describe("Require number in password"),
      PasswordRequireSymbols: z.boolean().optional().describe("Require symbol in password"),
      TemporaryPasswordValidityDays: z.number().int().min(1).max(365).optional().describe("Days before temporary password expires"),

      // ── Account recovery
      AccountRecoveryMechanisms: z
        .array(
          z.object({
            Name: z.enum(["verified_email", "verified_phone_number", "admin_only"]),
            Priority: z.number().int().min(1).max(2),
          })
        )
        .optional()
        .describe("Ordered list of account recovery mechanisms"),

      // ── Admin create user
      AllowAdminCreateUserOnly: z.boolean().optional().describe("Only admins can create users (no self-registration)"),
      InviteEmailSubject: z.string().optional().describe("Subject for admin invite email"),
      InviteEmailMessage: z.string().optional().describe("Body for admin invite email (must include {username} and {####})"),
      InviteSmsMessage: z.string().optional().describe("SMS message for admin invite (must include {username} and {####})"),

      // ── Email configuration
      EmailSendingAccount: z.enum(["COGNITO_DEFAULT", "DEVELOPER"]).optional().describe("Email sending account type"),
      FromEmailAddress: z.string().email().optional().describe("From address for emails (required for DEVELOPER sending account)"),
      ReplyToEmailAddress: z.string().email().optional().describe("Reply-to email address"),
      SourceArn: z.string().optional().describe("SES source ARN (required for DEVELOPER sending account)"),

      // ── Email verification messages
      EmailVerificationSubject: z.string().optional().describe("Subject for email verification message"),
      EmailVerificationMessage: z.string().optional().describe("Body for email verification (must include {####})"),

      // ── SMS configuration
      SnsCallerArn: z.string().optional().describe("IAM role ARN for Cognito to send SMS via SNS"),
      SnsRegion: z.string().optional().describe("AWS region for SNS SMS sending"),
      ExternalId: z.string().optional().describe("External ID used in the IAM role trust policy for SNS"),
      SmsVerificationMessage: z.string().optional().describe("SMS verification message (must include {####})"),
      SmsAuthenticationMessage: z.string().optional().describe("SMS MFA message (must include {####})"),

      // ── Device tracking
      ChallengeRequiredOnNewDevice: z.boolean().optional().describe("Require MFA challenge on new/unrecognized devices"),
      DeviceOnlyRememberedOnUserPrompt: z.boolean().optional().describe("Only remember device if user opts in"),

      // ── Username configuration
      CaseSensitiveUsername: z.boolean().optional().describe("Whether username matching is case-sensitive"),

      // ── Advanced security / add-ons
      AdvancedSecurityMode: z.enum(["OFF", "AUDIT", "ENFORCED"]).optional().describe("Advanced security mode (UserPoolAddOns)"),

      // ── WebAuthn / passkeys
      WebAuthnRelyingPartyID: z.string().optional().describe("Relying party ID for WebAuthn/passkey authentication"),
      WebAuthnUserVerification: z.enum(["required", "preferred", "discouraged"]).optional().describe("WebAuthn user verification requirement"),

      // ── User attribute update settings
      AttributesRequireVerificationBeforeUpdate: z
        .array(z.enum(["email", "phone_number"]))
        .optional()
        .describe("Attributes that must be re-verified before being updated"),

      // ── Schema attributes
      SchemaAttributes: z
        .array(
          z.object({
            Name: z.string(),
            AttributeDataType: z.enum(["String", "Number", "DateTime", "Boolean"]),
            Mutable: z.boolean().optional(),
            Required: z.boolean().optional(),
            MinLength: z.string().optional(),
            MaxLength: z.string().optional(),
          })
        )
        .optional()
        .describe("Custom schema attributes for the User Pool"),

      // ── Lambda triggers
      PreSignUp: z.string().optional().describe("Lambda ARN: pre sign-up trigger"),
      PostConfirmation: z.string().optional().describe("Lambda ARN: post confirmation trigger"),
      PreAuthentication: z.string().optional().describe("Lambda ARN: pre authentication trigger"),
      PostAuthentication: z.string().optional().describe("Lambda ARN: post authentication trigger"),
      PreTokenGeneration: z.string().optional().describe("Lambda ARN: pre token generation trigger"),
      CustomMessage: z.string().optional().describe("Lambda ARN: custom message trigger"),
      DefineAuthChallenge: z.string().optional().describe("Lambda ARN: define auth challenge trigger"),
      CreateAuthChallenge: z.string().optional().describe("Lambda ARN: create auth challenge trigger"),
      VerifyAuthChallengeResponse: z.string().optional().describe("Lambda ARN: verify auth challenge response trigger"),
      UserMigration: z.string().optional().describe("Lambda ARN: user migration trigger"),

      // ── Tags
      Tags: z
        .record(z.string())
        .optional()
        .describe("Key-value tags to apply to the User Pool"),


    },

    async (params) => {
      const {
        UserPoolName, UserPoolTier, DeletionProtection,
        UsernameAttributes, AliasAttributes, AutoVerifiedAttributes,
        MfaConfiguration, EnabledMfas,
        PasswordMinimumLength, PasswordRequireUppercase, PasswordRequireLowercase,
        PasswordRequireNumbers, PasswordRequireSymbols, TemporaryPasswordValidityDays,
        AccountRecoveryMechanisms,
        AllowAdminCreateUserOnly, InviteEmailSubject, InviteEmailMessage, InviteSmsMessage,
        EmailSendingAccount, FromEmailAddress, ReplyToEmailAddress, SourceArn,
        EmailVerificationSubject, EmailVerificationMessage,
        SnsCallerArn, SnsRegion, ExternalId, SmsVerificationMessage, SmsAuthenticationMessage,
        ChallengeRequiredOnNewDevice, DeviceOnlyRememberedOnUserPrompt,
        CaseSensitiveUsername,
        AdvancedSecurityMode,
        WebAuthnRelyingPartyID, WebAuthnUserVerification,
        AttributesRequireVerificationBeforeUpdate,
        SchemaAttributes,
        PreSignUp, PostConfirmation, PreAuthentication, PostAuthentication,
        PreTokenGeneration, CustomMessage, DefineAuthChallenge, CreateAuthChallenge,
        VerifyAuthChallengeResponse, UserMigration,
        Tags,
      } = params;

      // ── Build the properties object (only include defined values)
      const props = {};

      props.UserPoolName = UserPoolName;
      if (UserPoolTier) props.UserPoolTier = UserPoolTier;
      if (DeletionProtection) props.DeletionProtection = DeletionProtection;
      if (UsernameAttributes?.length) props.UsernameAttributes = UsernameAttributes;
      if (AliasAttributes?.length) props.AliasAttributes = AliasAttributes;
      if (AutoVerifiedAttributes?.length) props.AutoVerifiedAttributes = AutoVerifiedAttributes;
      if (MfaConfiguration) props.MfaConfiguration = MfaConfiguration;
      if (EnabledMfas?.length) props.EnabledMfas = EnabledMfas;

      // Password policy
      const hasPasswordPolicy = [
        PasswordMinimumLength, PasswordRequireUppercase, PasswordRequireLowercase,
        PasswordRequireNumbers, PasswordRequireSymbols, TemporaryPasswordValidityDays,
      ].some((v) => v !== undefined);
      if (hasPasswordPolicy) {
        props.Policies = {
          PasswordPolicy: {
            ...(PasswordMinimumLength !== undefined && { MinimumLength: PasswordMinimumLength }),
            ...(PasswordRequireUppercase !== undefined && { RequireUppercase: PasswordRequireUppercase }),
            ...(PasswordRequireLowercase !== undefined && { RequireLowercase: PasswordRequireLowercase }),
            ...(PasswordRequireNumbers !== undefined && { RequireNumbers: PasswordRequireNumbers }),
            ...(PasswordRequireSymbols !== undefined && { RequireSymbols: PasswordRequireSymbols }),
            ...(TemporaryPasswordValidityDays !== undefined && { TemporaryPasswordValidityDays }),
          },
        };
      }

      // Account recovery
      if (AccountRecoveryMechanisms?.length) {
        props.AccountRecoverySetting = {
          RecoveryMechanisms: AccountRecoveryMechanisms,
        };
      }

      // Admin create user
      const hasAdminCreateUser = [AllowAdminCreateUserOnly, InviteEmailSubject, InviteEmailMessage, InviteSmsMessage].some((v) => v !== undefined);
      if (hasAdminCreateUser) {
        props.AdminCreateUserConfig = {
          ...(AllowAdminCreateUserOnly !== undefined && { AllowAdminCreateUserOnly }),
          ...(InviteEmailSubject || InviteEmailMessage || InviteSmsMessage
            ? {
                InviteMessageTemplate: {
                  ...(InviteEmailSubject && { EmailSubject: InviteEmailSubject }),
                  ...(InviteEmailMessage && { EmailMessage: InviteEmailMessage }),
                  ...(InviteSmsMessage && { SMSMessage: InviteSmsMessage }),
                },
              }
            : {}),
        };
      }

      // Email config
      const hasEmailConfig = [EmailSendingAccount, FromEmailAddress, ReplyToEmailAddress, SourceArn].some((v) => v !== undefined);
      if (hasEmailConfig) {
        props.EmailConfiguration = {
          ...(EmailSendingAccount && { EmailSendingAccount }),
          ...(FromEmailAddress && { From: FromEmailAddress }),
          ...(ReplyToEmailAddress && { ReplyToEmailAddress }),
          ...(SourceArn && { SourceArn }),
        };
      }

      if (EmailVerificationSubject) props.EmailVerificationSubject = EmailVerificationSubject;
      if (EmailVerificationMessage) props.EmailVerificationMessage = EmailVerificationMessage;

      // SMS config
      if (SnsCallerArn) {
        props.SmsConfiguration = {
          SnsCallerArn,
          ...(SnsRegion && { SnsRegion }),
          ...(ExternalId && { ExternalId }),
        };
      }
      if (SmsVerificationMessage) props.SmsVerificationMessage = SmsVerificationMessage;
      if (SmsAuthenticationMessage) props.SmsAuthenticationMessage = SmsAuthenticationMessage;

      // Device config
      const hasDeviceConfig = [ChallengeRequiredOnNewDevice, DeviceOnlyRememberedOnUserPrompt].some((v) => v !== undefined);
      if (hasDeviceConfig) {
        props.DeviceConfiguration = {
          ...(ChallengeRequiredOnNewDevice !== undefined && { ChallengeRequiredOnNewDevice }),
          ...(DeviceOnlyRememberedOnUserPrompt !== undefined && { DeviceOnlyRememberedOnUserPrompt }),
        };
      }

      // Username config
      if (CaseSensitiveUsername !== undefined) {
        props.UsernameConfiguration = { CaseSensitive: CaseSensitiveUsername };
      }

      // Add-ons
      if (AdvancedSecurityMode) {
        props.UserPoolAddOns = { AdvancedSecurityMode };
      }

      // WebAuthn
      if (WebAuthnRelyingPartyID) props.WebAuthnRelyingPartyID = WebAuthnRelyingPartyID;
      if (WebAuthnUserVerification) props.WebAuthnUserVerification = WebAuthnUserVerification;

      // Attribute update settings
      if (AttributesRequireVerificationBeforeUpdate?.length) {
        props.UserAttributeUpdateSettings = { AttributesRequireVerificationBeforeUpdate };
      }

      // Schema
      if (SchemaAttributes?.length) {
        props.Schema = SchemaAttributes.map(({ Name, AttributeDataType, Mutable, Required, MinLength, MaxLength }) => ({
          Name,
          AttributeDataType,
          ...(Mutable !== undefined && { Mutable }),
          ...(Required !== undefined && { Required }),
          ...((MinLength || MaxLength) && {
            StringAttributeConstraints: {
              ...(MinLength && { MinLength }),
              ...(MaxLength && { MaxLength }),
            },
          }),
        }));
      }

      // Lambda triggers
      const lambdaMap = {
        PreSignUp, PostConfirmation, PreAuthentication, PostAuthentication,
        PreTokenGeneration, CustomMessage, DefineAuthChallenge, CreateAuthChallenge,
        VerifyAuthChallengeResponse, UserMigration,
      };
      const lambdaConfig = Object.fromEntries(
        Object.entries(lambdaMap).filter(([, v]) => v !== undefined)
      );
      if (Object.keys(lambdaConfig).length) props.LambdaConfig = lambdaConfig;

      // Tags
      if (Tags && Object.keys(Tags).length) props.UserPoolTags = Tags;

      // ── Serialize to YAML manually (no extra deps)
      const yaml = buildYaml(props);

      const cfTemplate = [
        "AWSTemplateFormatVersion: '2010-09-09'",
        "Description: Cognito User Pool generated by cognito-mcp",
        "",
        "Resources:",
        "  CognitoUserPool:",
        "    Type: AWS::Cognito::UserPool",
        "    Properties:",
        yaml
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n"),
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Here is your Cognito User Pool CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\nSave this as \`cognito-userpool.yaml\` in your project.`,
          },
        ],
      };
    }
  );
}
