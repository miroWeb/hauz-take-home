import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

const COOKIE_NAME = 'hauz_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export function readSessionCookie() {
  return getCookie(COOKIE_NAME) ?? null
}

export function writeSessionCookie(secret: string) {
  setCookie(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
}

export function clearSessionCookie() {
  deleteCookie(COOKIE_NAME, { path: '/' })
}