import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { openapi } from './openapi.js'
import {
  COMPANY_ID,
  attendanceActivities,
  attendanceHistory,
  eachDate,
  employees,
  employmentStatuses,
  findUser,
  liveLocations,
  organizations,
  timeOffPolicies,
  ymd,
} from './data.js'

const app = new Hono()
app.use('*', cors())

// ---------- Docs ----------
app.get('/', (c) => c.redirect('/docs'))
app.get('/openapi.json', (c) => c.json(openapi))
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// ---------- Auth opsional (meniru bentuk header HMAC, tanpa verifikasi tanda tangan) ----------
app.use('/v2/*', async (c, next) => {
  if (process.env.REQUIRE_AUTH === 'true') {
    const auth = c.req.header('Authorization') ?? ''
    if (!auth.toLowerCase().startsWith('hmac ') || !c.req.header('Date')) {
      return c.json({ message: 'Unauthorized' }, 401)
    }
  }
  await next()
})

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

// ---------- Employee ----------
app.get('/v2/talenta/v3/employees', (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1) || 1)
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20) || 20))
  const slice = employees.slice((page - 1) * limit, page * limit)
  return c.json({
    message: 'Get Employees Successfully',
    data: { employees: slice, pagination: { page, limit, total: employees.length } },
  })
})

app.get('/v2/talenta/v2/company/me/employment-status', (c) =>
  c.json({ message: 'Get Employment Status Successfully', data: { employment_status: employmentStatuses } }),
)

app.get('/v2/talenta/v2/company/:companyId/organization', (c) => {
  if (Number(c.req.param('companyId')) !== COMPANY_ID) {
    return c.json({ message: `Company not found (mock hanya mengenal ${COMPANY_ID})` }, 404)
  }
  return c.json({ message: 'Get Organization Successfully', data: { organizations } })
})

// ---------- Attendance ----------
app.get('/v2/talenta/v2/live-attendance/location', (c) => {
  const id = c.req.query('user_id')
  if (!id) return c.json({ message: 'user_id is required' }, 400)
  const user = findUser(id)
  if (!user) return c.json({ message: 'User not found' }, 404)
  return c.json({ message: 'Get Live Attendance Location Successfully', data: { locations: liveLocations(user) } })
})

app.get('/v2/talenta/v2/attendance/activities', (c) => {
  const today = new Date().toISOString().slice(0, 10)
  const start = c.req.query('start_date') ?? today
  const end = c.req.query('end_date') ?? start
  if (!isDate(start) || !isDate(end) || end < start) {
    return c.json({ message: 'start_date/end_date must be YYYY-MM-DD and end_date >= start_date' }, 400)
  }
  const activities = eachDate(start, end).flatMap((d) => attendanceActivities(d))
  return c.json({ message: 'Get Attendance Activities Successfully', data: { activities } })
})

app.get('/v2/talenta/v2/attendance/:userId/history-list', (c) => {
  const user = findUser(c.req.param('userId'))
  if (!user) return c.json({ message: 'User not found' }, 404)

  const year = Number(c.req.query('year'))
  const month = Number(c.req.query('month'))
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 2000 || month < 1 || month > 12) {
    return c.json({ message: 'year and month are required' }, 400)
  }
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayQ = c.req.query('day')
  const days = dayQ ? [Number(dayQ)] : Array.from({ length: daysInMonth }, (_, i) => i + 1)
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > daysInMonth)) {
    return c.json({ message: 'day is out of range' }, 400)
  }

  const history = days.flatMap((d) => attendanceHistory(user, ymd(year, month, d)))
  return c.json({ message: 'Get Attendance History Successfully', data: { history } })
})

// ---------- Time off ----------
app.get('/v2/talenta/v3/time-off/policies/users/:userId', (c) => {
  const user = findUser(c.req.param('userId'))
  if (!user) return c.json({ message: 'User not found' }, 404)
  return c.json({ message: 'Get Time Off Policies Successfully', data: { policies: timeOffPolicies } })
})

app.notFound((c) => c.json({ message: 'Not found' }, 404))

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, () => {
  console.log(`Mock Talenta API jalan di http://localhost:${port}`)
  console.log(`Swagger UI:           http://localhost:${port}/docs`)
})
