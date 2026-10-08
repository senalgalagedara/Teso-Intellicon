export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { updateSession } from './middleware';
export { login, signup, logout, getCurrentUser } from './actions';
export { AuthProvider, useAuth } from './hooks';

