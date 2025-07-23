// Global imports to ensure all lib modules are bundled by Vercel
// This file is imported by layout.tsx to guarantee module resolution

// Force import all lib modules
import '@/lib/api';
import '@/lib/auth';
import '@/lib/csrf';
import '@/lib/csrf-utils';
import '@/lib/environment';
import '@/lib/errorMessages';
import '@/lib/jwt';
import '@/lib/logging';
import '@/lib/relationship';
import '@/lib/utils';

// Ensure modules are loaded
if (typeof window !== 'undefined') {
  console.log('All lib modules loaded successfully');
}
