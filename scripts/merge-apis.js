const fs = require('fs');
const path = require('path');

const services = ['auth-service', 'etudiant-service', 'transaction-service', 'order-service'];
const rootSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ProgiTresor Unified API Documentation',
    version: '1.0.0',
    description: 'Unified contract for all ProgiTresor microservices'
  },
  paths: {},
  components: {
    schemas: {},
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

for (const service of services) {
  const filePath = path.join(__dirname, `../apps/services/${service}/openapi.json`);
  if (fs.existsSync(filePath)) {
    try {
      const spec = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Merge paths
      if (spec.paths) {
        for (const [pathKey, pathVal] of Object.entries(spec.paths)) {
          const prefix = service.replace('-service', '');
          rootSpec.paths[`/api/${prefix}${pathKey}`] = pathVal;
        }
      }
      
      // Merge components schemas
      if (spec.components && spec.components.schemas) {
        Object.assign(rootSpec.components.schemas, spec.components.schemas);
      }
    } catch (err) {
      console.error(`Failed to parse openapi.json for ${service}:`, err.message);
    }
  } else {
    console.warn(`No openapi.json found for service: ${service}. Did you run generate:docs?`);
  }
}

const destDir = path.join(__dirname, '../docs/04-api-documentation');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(path.join(destDir, 'api-complete.json'), JSON.stringify(rootSpec, null, 2));
console.log('Merged OpenAPI specifications successfully into docs/04-api-documentation/api-complete.json');
