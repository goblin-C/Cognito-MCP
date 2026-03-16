import { z } from "zod";
import { buildYaml } from '../utils/helpers.js'

/**
 * Tool: auth.configure
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
    "auth.configure",
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
