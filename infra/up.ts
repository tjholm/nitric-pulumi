// alias the nitric gateway
import * as aws from '@pulumi/aws';
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { getNitricStack, getNitricYaml } from './config';

// Set the base domain here (args could also be used as well)
const BASE_DOMAIN = "example.com"

const run = async () => {
    // read the nitric.yaml file
    const project = getNitricYaml();
    const stack = await getNitricStack();

    // get the current deployment state
    const currentDeployment = await stack.exportStack();
    const currentInfo = await stack.info();
    // get the arns of any apis and sort them by their nitric names
    const nitricApis: string[] = currentDeployment.deployment.resources
        .filter(({type}) => type === "aws:apigatewayv2/api:Api")
        .map(({outputs}) => outputs.id)

    // get the current nitric stack
    const dnsStack = await LocalWorkspace.createOrSelectStack({
        projectName: `${project['name']}-dns`,
        stackName: `${project['name']}-dns-aws`,
        program: async () => {
            // Get the existing nitric APIs
            const apis = await Promise.all(nitricApis.map(async (apiId) => {
                return await aws.apigatewayv2.getApi({ apiId });
            }));

            for (const idx in apis) {
                const api = apis[idx];
                const nitricName = api.tags['x-nitric-name'];
                const domain = `${nitricName}.${BASE_DOMAIN}`;

                // Search for an existing ACM certificate
                // Use this if managing DNS externally
                const existingCertificate = await aws.acm.getCertificate({domain: domain, statuses: ["ISSUED"]})
                
                // const sslCertificate = new aws.acm.Certificate(
                //     "ssl-cert",
                //     {
                //         domainName: domain,
                //         validationMethod: "DNS",
                //     }
                // );
    
                // // Create a DNS zone for our custom domain
                // const zone = new aws.route53.Zone("dns-zone", {
                //     name: domain,
                // });
    
                // // Create DNS record to prove to ACM that we own the domain
                // // Note: This will only work if your domain name is managed with route53
                // const sslCertificateValidationDnsRecord = new aws.route53.Record(
                //     "ssl-cert-validation-dns-record",
                //     {
                //         zoneId: zone.zoneId,
                //         name: sslCertificate.domainValidationOptions[0].resourceRecordName,
                //         type: sslCertificate.domainValidationOptions[0].resourceRecordType,
                //         records: [sslCertificate.domainValidationOptions[0].resourceRecordValue],
                //         ttl: 10 * 60, // 10 minutes
                //     }
                // );
    
                // const validatedSslCertificate = new aws.acm.CertificateValidation(
                //     "ssl-cert-validation",
                //     {
                //         certificateArn: sslCertificate.arn,
                //         validationRecordFqdns: [sslCertificateValidationDnsRecord.fqdn],
                //     }
                // );
    
                const apiDomainName = new aws.apigatewayv2.DomainName("api-domain-name", {
                    domainNameConfiguration: {
                        endpointType: 'REGIONAL',
                        securityPolicy: 'TLS_1_2',
                        // certificateArn: existingCertificate.certificateArn,
                        certificateArn: existingCertificate.arn,
                    }, 
                    domainName: domain,
                });

                // create the DNS record
                // NOTE: Use this if managing your domains DNS via route53
                // const dnsRecord = new aws.route53.Record("api-dns", {
                //     zoneId: zone.zoneId,
                //     type: "A",
                //     name: domain,
                //     aliases: [{
                //         name: apiDomainName.domainNameConfiguration.targetDomainName,
                //         evaluateTargetHealth: false,
                //         zoneId: apiDomainName.domainNameConfiguration.hostedZoneId,
                //     }]
                // });
    
                // create the domain name mapping to the api gateway
                const basePathMapping = new aws.apigatewayv2.ApiMapping('domain-mapping', {
                    apiId: api.apiId,
                    domainName: apiDomainName.domainName,
                    stage: '$default',
                });
            }
        },
    });

    await dnsStack.setAllConfig(currentInfo.config);

    const result = await dnsStack.up();
};

run().catch((err) => console.log(err));