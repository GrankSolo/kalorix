// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const basicAuth = request.headers.get('authorization')

  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (!basicAuth) {
    return new Response('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  const authValue = basicAuth.split(' ')[1]
  const [user, pass] = atob(authValue).split(':')

  const expectedUser = process.env.BASIC_AUTH_USER
  const expectedPass = process.env.BASIC_AUTH_PASS

  if (user === expectedUser && pass === expectedPass) {
    return NextResponse.next()
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}