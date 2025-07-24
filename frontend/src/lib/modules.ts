// Module registry for Vercel build compatibility
// This file ensures all lib modules are properly bundled

// Force import all modules to guarantee they're included in build
import * as apiModule from './api';
import * as authModule from './auth';
import * as csrfModule from './csrf';
import * as csrfUtilsModule from './csrf-utils';
import * as environmentModule from './environment';
import * as errorMessagesModule from './errorMessages';
import * as jwtModule from './jwt';
import * as loggingModule from './logging';
import * as relationshipModule from './relationship';
import * as utilsModule from './utils';

// Export modules registry
export const modules = {
  api: apiModule,
  auth: authModule,
  csrf: csrfModule,
  csrfUtils: csrfUtilsModule,
  environment: environmentModule,
  errorMessages: errorMessagesModule,
  jwt: jwtModule,
  logging: loggingModule,
  relationship: relationshipModule,
  utils: utilsModule,
};

// Ensure modules are loaded
console.log('Lib modules loaded:', Object.keys(modules));
