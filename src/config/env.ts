/**
 * Environment resolution. Everything is overridable via env vars so the same suite can point at
 * dev / staging / prod. Defaults target the public Restful-Booker demo.
 */
export const config = {
  baseURL: process.env.BASE_URL || 'https://restful-booker.herokuapp.com',
  username: process.env.API_USERNAME || 'admin',
  password: process.env.API_PASSWORD || 'password123',
};

/** Headers every request sends (the API needs Accept: application/json to return JSON). */
export const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
