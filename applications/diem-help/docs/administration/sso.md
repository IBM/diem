<!-- markdownlint-disable MD033 -->
# SSO For Diem

SSO is managed by IBM SSO [https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/home](https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/home)

[ETL_Manager](https://ies-provisioner.prod.identity-services.intranet.ibm.com/tools/sso/application/edit?appID=5027d97f-c79f-4153-8124-69f67eebbafe) is the main registration and contains following registrations

| Name              | Callback                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| DIEM-prod         | <https://diem.mybluemix.net/sso/callback>                                                       |
| DIEM-dev-uat      | <https://diem-dev.mybluemix.net/sso/callback><br/><https://diem-uat.mybluemix.net/sso/callback> |
| Required URL      | Development                                                                                     |
| AUTHORIZATION_URL | <https://preprod.login.w3.ibm.com/oidc/endpoint/default/authorize>                              |
| DISCOVERY_URL     | <https://preprod.login.w3.ibm.com/oidc/endpoint/default/.well-known/openid-configuration>       |
| ISSUER            | <https://preprod.login.w3.ibm.com/oidc/endpoint/default>                                        |
| TOKEN_URL         | <https://preprod.login.w3.ibm.com/oidc/endpoint/default/token>                                  |
| Required URL      | Production                                                                                      |
| AUTHORIZATION_URL | <https://login.w3.ibm.com/oidc/endpoint/default/authorize>                                      |
| DISCOVERY_URL     | <https://login.w3.ibm.com/oidc/endpoint/default/.well-known/openid-configuration>               |
| ISSUER            | <https://login.w3.ibm.com/oidc/endpoint/default>                                                |
| TOKEN_URL         | <https://login.w3.ibm.com/oidc/endpoint/default/token>                                          |

{.bx--data-table}

You Need also the Client ID and Client Secret
