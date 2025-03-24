import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a custom fetch function with proper headers
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  
  return fetch(url, {
    ...options,
    headers,
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
}); 