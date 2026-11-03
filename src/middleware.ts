import { NextResponse, type NextRequest } from 'next/server';

const REALM = 'feedback-system';

/**
 * 恒定时间字符串比较，避免通过响应时间推测密码。
 * 只依赖字符串比较，不引入 Node 专属 API，可在 Cloudflare Workers 运行时使用。
 */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // 环境变量缺失时失败关闭：宁可 503 也不放行。
  // 用 503 而不是 401，便于区分“没配置”和“密码输错”，避免部署后误判为密码问题。
  if (!user || !pass) {
    return new NextResponse('Basic Auth 未配置：缺少 BASIC_AUTH_USER / BASIC_AUTH_PASS', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) {
    return unauthorized();
  }

  // atob 在 Workers/Edge 与 Node 16+ 均可用，不依赖 Buffer。
  let decoded = '';
  try {
    decoded = atob(header.slice('Basic '.length).trim());
  } catch {
    return unauthorized();
  }

  if (!safeEqual(decoded, `${user}:${pass}`)) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  // 排除 Next 静态资源与图标，其余（含 /api/*）全部保护
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
