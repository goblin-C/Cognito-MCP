import { z } from "zod";
import { buildYaml } from '../utils/helpers.js'

const FIELD_DOCS = {
  Domain: {
    summary: "The domain prefix or full custom domain for the Cognito hosted UI.",
    detail:
      "For a Cognito-managed domain, provide just the prefix (e.g. 'myapp') — Cognito constructs the full URL as myapp.auth.<region>.amazoncognito.com. " +
      "For a custom domain, provide the full domain (e.g. 'auth.myapp.com') and also supply CertificateArn. " +
      "The prefix must be globally unique across all Cognito pools, lowercase, and contain only letters, numbers, and hyphens.",
    example: "myapp-auth",
  },
  UserPoolId: {
    summary: "The ID of the User Pool to attach this domain to.",
    detail: "Returned after creating the User Pool. Format: region_xxxxxxxxx. Each User Pool can have only one domain.",
    example: "us-east-1_AbCdEfGhI",
  },
  ManagedLoginVersion: {
    summary: "Hosted UI version: 1 (classic) or 2 (new managed login).",
    detail:
      "Version 1 is the original Cognito hosted UI — widely supported but limited customisation. " +
      "Version 2 is the newer managed login experience with improved branding controls, custom CSS, and a refreshed default design. " +
      "Defaults to 1 if omitted. Version 2 requires the User Pool to be on ESSENTIALS or PLUS tier.",
    example: 2,
  },
  CertificateArn: {
    summary: "ACM certificate ARN for a custom domain. Omit for a Cognito-prefixed domain.",
    detail:
      "The certificate MUST be in us-east-1 (N. Virginia), regardless of where your User Pool is deployed — this is an AWS requirement. " +
      "The certificate must cover the exact custom domain you are using (or a wildcard that matches it). " +
      "You must also create a CNAME record in your DNS pointing your custom domain to the CloudFront distribution that Cognito provides after domain creation.",
    example: "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  },
};

/**
 * Tool: auth.describe-domain
 *
 * Returns detailed documentation for one or more Cognito User Pool Domain
 * configuration fields from the local FIELD_DOCS map.
 *
 * Use this before auth.configure-domain whenever the user asks what a field
 * does or is unsure which option to pick. Do NOT guess — look up the field
 * first, then explain it to the user in plain language.
 */
export function registerUserPoolDomainDescribeTool(server) {
  server.tool(
    "auth.describe-domain",
    `Return detailed documentation for one or more Cognito User Pool Domain configuration fields.
Use this tool BEFORE calling auth.configure-domain whenever the user asks what a field does,
is unsure which option to pick, or you need to present options clearly.
Do NOT guess — look up the field first, then explain it to the user in plain language.`,
    {
      fields: z
        .array(z.string())
        .describe("Field names to look up, e.g. ['Domain', 'CertificateArn']"),
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
 * Tool: auth.configure-domain
 *
 * Collects AWS Cognito User Pool Domain configuration from the developer and
 * returns a CloudFormation YAML string (AWS::Cognito::UserPoolDomain).
 *
 * Supports both Cognito-prefixed domains and custom domains (via ACM certificate).
 *
 * Output: cognito-userpool-domain.yaml
 * Next step: run auth.plan to validate and preview all changes before deploying
 */

export function registerUserPoolDomainTool(server) {
  server.tool(
    "auth.configure-domain",
    "Configure an AWS Cognito User Pool Domain and return a CloudFormation YAML",
    {
      Domain: z.string().describe("Domain prefix for the Cognito hosted UI (e.g. 'myapp' → myapp.auth.us-east-1.amazoncognito.com), or full custom domain if using ACM certificate"),
      UserPoolId: z.string().describe("ID of the User Pool to associate this domain with"),
      ManagedLoginVersion: z.number().int().min(1).max(2).optional().describe("Managed login page version: 1 (classic) or 2 (new managed login)"),
      CertificateArn: z.string().optional().describe("ACM certificate ARN in us-east-1 for a custom domain (omit for Cognito-prefixed domain)"),
    },

    async ({ Domain, UserPoolId, ManagedLoginVersion, CertificateArn }) => {
      const props = {};

      props.Domain = Domain;
      props.UserPoolId = UserPoolId;
      if (ManagedLoginVersion !== undefined) props.ManagedLoginVersion = ManagedLoginVersion;
      if (CertificateArn) props.CustomDomainConfig = { CertificateArn };

      const yaml = buildYaml(props);

      const cfTemplate = [
        "AWSTemplateFormatVersion: '2010-09-09'",
        "Description: Cognito User Pool Domain generated by cognito-mcp",
        "",
        "Resources:",
        "  CognitoUserPoolDomain:",
        "    Type: AWS::Cognito::UserPoolDomain",
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
            text: `Here is your Cognito User Pool Domain CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\nSave this as \`cognito-userpool-domain.yaml\` in your project.`,
          },
        ],
      };
    }
  );
}
