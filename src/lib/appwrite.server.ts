import { Client } from 'node-appwrite'

/**
 * Server-only Appwrite client builders.
 *
 *  - createAdminClient — endpoint + project + API key. Only used for the two
 *    calls that happen before a session exists (email token, session
 *    exchange) — Appwrite only returns the session secret in the response
 *    when the caller is an API-key context, per its official SSR pattern.
 *  - createSessionClient — endpoint + project + a user's session secret.
 *    Every authenticated call (Account.get, calling the Function) goes
 *    through this, so Appwrite always knows exactly which user is calling.
 *
 * The session secret itself never reaches the browser as JS-readable data —
 * it only ever lives in an httpOnly cookie (see session.server.ts).
 */

function endpoint() {
  const value = process.env.APPWRITE_ENDPOINT
  if (!value) throw new Error('APPWRITE_ENDPOINT is not set')
  return value
}

function projectId() {
  const value = process.env.APPWRITE_PROJECT_ID
  if (!value) throw new Error('APPWRITE_PROJECT_ID is not set')
  return value
}

function apiKey() {
  const value = process.env.APPWRITE_API_KEY
  if (!value) throw new Error('APPWRITE_API_KEY is not set')
  return value
}

export function createAdminClient() {
  return new Client().setEndpoint(endpoint()).setProject(projectId()).setKey(apiKey())
}

export function createSessionClient(sessionSecret: string) {
  return new Client()
    .setEndpoint(endpoint())
    .setProject(projectId())
    .setSession(sessionSecret)
}

export function functionId() {
  const value = process.env.APPWRITE_FUNCTION_ID
  if (!value) throw new Error('APPWRITE_FUNCTION_ID is not set')
  return value
}