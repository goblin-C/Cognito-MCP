import YAML from "yaml";

export function generateCognitoYaml(config) {
  const template = {
    Type: "AWS::Cognito::UserPool",
    Properties: {
      UserPoolName: config.userPoolName,
      MfaConfiguration: config.mfaConfiguration,
      UsernameAttributes: [config.usernameAttribute],
      AutoVerifiedAttributes: [config.autoVerify]
    }
  };

  return YAML.stringify(template);
}