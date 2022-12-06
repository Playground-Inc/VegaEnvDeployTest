"use strict";

const pascalCase = (str) => {
  return str.replace(/(\w)(\w*)/g, function (g0, g1, g2) {
    return g1.toUpperCase() + g2.toLowerCase();
  });
};

const conf = (attr, stage, region) => {
  const attrs = {
    s3Bucket: {
      prod: "vega-deployment-" + region + "-prod",
      dev: "vega-deployment-" + region + "-dev",
      default: "vega-deployment-" + region + "-" + stage + "-dev",
    },
    s3DeploymentBucket: {
      prod: "vega-" + region + "-prod",
      preprod: "vega-" + region + "-prod",
      default: "vega-" + region + "-dev",
    },
    certificateDefault: {
      prod: "playgrnd.media",
      default: "*.dev.playgrnd.media",
    },
    dynamoSfx: {
      prod: "",
      preprod: "",
      dev: "_DEV",
      default: "_DEV_" + stage.toUpperCase().replaceAll("-", "_"),
    },
    elasticacheInstance: {
      prod: "cache.m6g.large",
      default: "cache.t2.micro",
    },
    hostAssets: {
      prod: "assets.playgrnd.media",
      default: stage + "-assets.dev.playgrnd.media",
    },
    hostAuth: {
      prod: "auth.playgrnd.media",
      default: stage + "-auth.dev.playgrnd.media",
    },
    prodPreprodOrDev: {
      prod: "prod",
      preprod: "prod",
      default: "dev",
    },
    subDomain: {
      prod: "xxx", // TODO: change this, temorary in order to prevent overriding prod
      default: stage + ".dev",
    },
    subDomainApi: {
      prod: "api",
      default: stage + "-api.dev",
    },
    subDomainPfx: {
      prod: "",
      default: "dev.",
    },
  };

  return attrs[attr]?.[stage] || attrs[attr].default;
};

class VegaPlugin {
  constructor(serverless, cliOptions, { log }) {
    this.serverless = serverless;
    const { service } = serverless;
    const { custom } = service;
    const { apps, env } = custom;

    // Custom variables
    // https://www.serverless.com/framework/docs/guides/plugins/custom-variables
    this.configurationVariablesSources = {
      vega: {
        async resolve({ address, resolveVariable }) {
          const stage = await resolveVariable("sls:stage");
          const region = await resolveVariable("aws:region");

          /**
           * Route 53 API
           */
          if (address === "route53") {
            let routes = {};

            // Playground Assets
            routes.PlaygrndAssetsRoute53 = {
              Type: "AWS::Route53::RecordSet",
              Properties: {
                HostedZoneName: `${conf("subDomainPfx", stage)}playgrnd.media.`,
                Comment: `${stage} API`,
                Name: `${conf("hostAssets", stage)}`,
                Type: "A",
                AliasTarget: {
                  HostedZoneId: "Z2FDTNDATAQYW2",
                  DNSName: {
                    "Fn::GetAtt": ["CloudFrontDistribution", "DomainName"],
                  },
                },
              },
            };

            // Playground Api
            routes.PlaygrndAssetsRoute53 = {
              Type: "AWS::Route53::RecordSet",
              Properties: {
                HostedZoneName: `${conf("subDomainPfx", stage)}playgrnd.media.`,
                Comment: `${stage} API`,
                Name: `${conf("subDomainApi", stage)}.playgrnd.media`,
                Type: "A",
                AliasTarget: {
                  HostedZoneId: "Z2FDTNDATAQYW2",
                  DNSName: {
                    "Fn::GetAtt": ["CloudFrontDistribution", "DomainName"],
                  },
                },
              },
            };

            log(" ");
            log.warning(
              "Add these domains on Vercel with " + env.BRANCH + " as branch:"
            );

            // Playground Auth Vercel
            routes.PlaygrndAuthVercelRoute53 = {
              Type: "AWS::Route53::RecordSet",
              Properties: {
                HostedZoneName: `${conf("subDomainPfx", stage)}playgrnd.media.`,
                Comment: `${stage} Vercel Auth`,
                Name: `${conf("hostAuth", stage)}`,
                Type: "CNAME",
                TTL: 300,
                ResourceRecords: ["cname.vercel-dns.com"],
              },
            };

            // loop domains for adding "*" as domain wildcard
            for (const app in apps)
              for (const domain in apps[app].domains) {
                // Apps API
                const rteDomain = pascalCase(domain).replace(".", "");
                routes[rteDomain + "ApiRoute53"] = {
                  Type: "AWS::Route53::RecordSet",
                  Properties: {
                    HostedZoneName: `${conf("subDomainPfx", stage)}${domain}.`,
                    Comment: `${stage} API`,
                    Name: `${conf("subDomainApi", stage)}.${domain}`,
                    Type: "A",
                    AliasTarget: {
                      HostedZoneId: "Z2FDTNDATAQYW2",
                      DNSName: {
                        "Fn::GetAtt": ["CloudFrontDistribution", "DomainName"],
                      },
                    },
                  },
                };

                // Apps Vercel
                routes[rteDomain + "VercelRoute53"] = {
                  Type: "AWS::Route53::RecordSet",
                  Properties: {
                    HostedZoneName: `${conf("subDomainPfx", stage)}${domain}.`,
                    Comment: `${stage} Vercel`,
                    Name: `${conf("subDomain", stage)}.${domain}`,
                    Type: "CNAME",
                    TTL: 300,
                    ResourceRecords: ["cname.vercel-dns.com"],
                  },
                };

                log.success(conf("subDomain", stage) + "." + domain);
              }

            log(" ");

            return {
              value: routes,
            };
          }

          /**
           * S3 Allowed origins
           */
          if (address === "s3AllowedOrigins") {
            let origins = [];

            if (stage !== "prod") origins.push("localhost:*");

            // loop domains for adding "*" as domain wildcard
            for (const app in apps)
              for (const domain in apps[app].domains)
                origins.push("https://*." + domain);

            return {
              value: origins,
            };
          }

          /**
           * Certificate domains
           */
          if (address === "certificateDomains") {
            let domains = [];

            log(" ");
            log("Creating certificate for:");

            if (stage === "prod") {
              domains.push("*.playgrnd.media");
              log.success("*.playgrnd.media");
            } else {
              domains.push("*.dev.playgrnd.media");
              log.success("*.dev.playgrnd.media");
            }

            // loop domains for adding "*" as domain wildcard
            for (const app in apps)
              for (const domain in apps[app].domains) {
                const certDomain =
                  "*." + (stage !== "prod" ? "dev." : "") + domain;
                domains.push(certDomain);
                log.success(certDomain);
              }

            return {
              value: domains,
            };
          }

          /**
           * Cloudfront aliases
           */
          if (address === "cloudfrontAliases") {
            let domains = [];

            const subDomainApi = conf("subDomainApi", stage);

            log(" ");
            log("Deploying API & assets to:");

            domains.push(
              conf("hostAssets", stage),
              subDomainApi + ".playgrnd.media"
            );
            log.success(conf("hostAssets", stage));
            log.success(subDomainApi + ".playgrnd.media");

            // loop domains for adding "*" as domain wildcard
            for (const app in apps)
              for (const domain in apps[app].domains) {
                domains.push(subDomainApi + "." + domain);
                log.success(subDomainApi + "." + domain);
              }

            return {
              value: domains,
            };
          }

          /**
           * Deploy dynamo tables?
           */
          if (address === "dynamoDb")
            return {
              value: env.CREATE_DB ? "DynamoDb" : "Empty",
            };

          /**
           * Deploy s3 bucket?
           */
          if (address === "s3")
            return {
              value: env.CREATE_BUCKET ? "S3" : "Empty",
            };

          /**
           * Deploy Elasticache?
           */
          if (address === "elasticache")
            return {
              value: env.CREATE_CACHE_CLUSTER ? "Elasticache" : "Empty",
            };

          /**
           * Deploy Vpc
           */
          if (address === "vpc")
            return {
              value: env.CREATE_CACHE_CLUSTER ? "Vpc" : "Empty",
            };

          /**
           * Get Redis Cluster Endpoint
           */
          if (address === "redisClusterEndpoint")
            return {
              value: env.CREATE_CACHE_CLUSTER
                ? {
                    "Fn::GetAtt": [
                      "ElasticacheCluster",
                      "RedisEndpointAddress",
                    ],
                  }
                : false,
            };

          const valueFromStage = conf(address, stage, region);

          // Debug
          // log(address, valueFromStage);

          // Resolver is expected to return an object with the value in the `value` property:
          return {
            value: valueFromStage,
          };
        },
      },
    };

    this.hooks = {
      initialize: () => this.init(log),
      "before:deploy:deploy": () => this.beforeDeploy(log),
      "after:deploy:deploy": () => this.afterDeploy(log),
    };
  }

  // Initialization
  init(log) {
    log("stage", this.serverless.service.provider.stage);

    // VPC enabled if cache cluster is created
    this.serverless.service.custom.vpcConfig.enabled =
      this.serverless.service.custom.env.CREATE_CACHE_CLUSTER;
    // if createNatGateway is a number, that number of NAT Gateways will be provisioned (true = each zones)
    this.serverless.service.custom.vpcConfig.createNatGateway =
      this.serverless.service.provider.stage === "prod" ? 3 : 1;
  }

  beforeDeploy(log) {
    log("Deploying " + this.serverless.service.provider.stage);
    log(" ");
  }

  afterDeploy(log) {
    const env = this.serverless.service.provider.environment;
    log("Environment variables:");
    log.success("BRANCH", env.BRANCH);
    log.success("BUCKET", env.BUCKET);
    log.success("DYNAMO_SFX", env.DYNAMO_SFX);
    log.success("HOST_ASSETS", env.HOST_ASSETS);
    log.success("HOST_AUTH", env.HOST_AUTH);
    log.success("REDIS_CLUSTER_ENDPOINT", env.REDIS_CLUSTER_ENDPOINT);
    log.success("REGION", env.REGION);
    log.success("STAGE", env.STAGE);
    log.success("SUB_DOMAIN", env.SUB_DOMAIN);
    log.success("SUB_DOMAIN_API", env.SUB_DOMAIN_API);
  }
}

module.exports = VegaPlugin;
