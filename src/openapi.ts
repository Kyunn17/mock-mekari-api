// Spesifikasi OpenAPI 3.0 untuk mock Talenta API (ditampilkan di /docs lewat Swagger UI).
// Nama field mengikuti contoh response di dokumentasi Talenta.
// Pembungkus response ({ message, data: { ... } }) dan path yang bertanda
// "ASUMSI" belum terkonfirmasi dari dokumentasi asli.

const str = { type: 'string' } as const
const int = { type: 'integer' } as const
const bool = { type: 'boolean' } as const
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const obj = (properties: Record<string, object>) => ({ type: 'object', properties })

const envelope = (key: string, itemSchema: object, extra: Record<string, object> = {}) =>
  obj({
    message: str,
    data: obj({ [key]: { type: 'array', items: itemSchema }, ...extra }),
  })

const ok = (description: string, schema: object) => ({
  '200': { description, content: { 'application/json': { schema } } },
  '401': { $ref: '#/components/responses/Unauthorized' },
})

const pathParam = (name: string, description: string, example?: string | number) => ({
  name, in: 'path', required: true, description, schema: str, ...(example ? { example: String(example) } : {}),
})
const query = (name: string, description: string, schema: object = str, required = false, example?: string | number) => ({
  name, in: 'query', required, description, schema, ...(example !== undefined ? { example } : {}),
})

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Mock Talenta API (POC)',
    version: '0.1.0',
    description:
      'API tiruan yang meniru endpoint Mekari Talenta, berisi **data dummy**, untuk POC pipeline Databricks (bronze → silver → gold).\n\n' +
      'Kebutuhan yang dilayani:\n' +
      '1. Visit Product/Sales/Technical di lokasi yang sama dalam 1 hari\n' +
      '2. Pegawai tidak absen / sakit / cuti\n' +
      '3. Karyawan yang kontraknya berakhir di bulan berjalan\n\n' +
      '**Autentikasi:** API asli memakai HMAC (header `Date` + `Authorization`). Mock ini tidak memeriksa tanda tangan; ' +
      'jika dijalankan dengan `REQUIRE_AUTH=true`, request tanpa kedua header itu akan ditolak 401.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Lokal' }],
  tags: [
    { name: 'Employee', description: 'Data pegawai, organisasi, status kepegawaian (tujuan 1 dan 3)' },
    { name: 'Attendance', description: 'Riwayat absen dan lokasi (tujuan 1 dan 2)' },
    { name: 'Time Off', description: 'Kebijakan cuti/sakit (tujuan 2)' },
  ],
  paths: {
    '/v2/talenta/v3/employees': {
      get: {
        tags: ['Employee'],
        summary: 'Get all employee (v3)',
        description: 'Daftar pegawai. Dipakai untuk tim (`organization_name`), status kontrak (`employment_status`) dan tanggal berakhir kontrak (`end_date`). Pagination: ASUMSI.',
        parameters: [
          query('page', 'Nomor halaman (ASUMSI)', { type: 'integer', default: 1, minimum: 1 }),
          query('limit', 'Jumlah per halaman (ASUMSI)', { type: 'integer', default: 20, minimum: 1, maximum: 100 }),
        ],
        responses: ok(
          'Berhasil',
          envelope('employees', ref('Employee'), {
            pagination: obj({ page: int, limit: int, total: int }),
          }),
        ),
      },
    },
    '/v2/talenta/v2/company/{companyId}/organization': {
      get: {
        tags: ['Employee'],
        summary: 'Get company organization',
        description: 'Struktur organisasi. Dipakai untuk memetakan pegawai ke tim Product / Sales / Technical.',
        parameters: [pathParam('companyId', 'ID perusahaan', 3620)],
        responses: {
          ...ok('Berhasil', envelope('organizations', ref('Organization'))),
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v2/talenta/v2/company/me/employment-status': {
      get: {
        tags: ['Employee'],
        summary: 'Get employment status',
        description: 'Daftar status kepegawaian. `is_end_date: true` artinya status itu punya tanggal berakhir (kontrak/probation).',
        responses: ok('Berhasil', envelope('employment_status', ref('EmploymentStatus'))),
      },
    },
    '/v2/talenta/v2/live-attendance/location': {
      get: {
        tags: ['Attendance'],
        summary: 'Get live attendance location',
        description: 'Daftar lokasi absen yang diizinkan untuk seorang pegawai (nama, koordinat, radius). Ini master lokasi, bukan kejadian absen.',
        parameters: [query('user_id', 'user_id atau employee_id pegawai', str, true, 2001)],
        responses: {
          ...ok('Berhasil', envelope('locations', ref('LiveAttendanceLocation'))),
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v2/talenta/v2/attendance/{userId}/history-list': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance history list',
        description:
          'Riwayat absen seorang pegawai per hari (atau seluruh bulan jika `day` dikosongkan).\n\n' +
          'Asumsi mock: pegawai yang **tidak absen** menghasilkan list kosong pada hari itu; sakit/cuti menghasilkan satu baris dengan `timeoff_code`.',
        parameters: [
          pathParam('userId', 'user_id atau employee_id pegawai', 2001),
          query('year', 'Tahun', int, true, 2026),
          query('month', 'Bulan (1-12)', int, true, 10),
          query('day', 'Tanggal (opsional)', int, false, 27),
        ],
        responses: {
          ...ok('Berhasil', envelope('history', ref('AttendanceHistoryItem'))),
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v2/talenta/v2/attendance/activities': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance activities (TAMBAHAN, path ASUMSI)',
        description:
          'Kejadian absen beserta koordinat (`location_coordinate`). Diperlukan untuk tujuan 1, karena history-list hanya punya `has_location`. ' +
          'Path dan parameter belum dipastikan dari dokumentasi asli.',
        parameters: [
          query('start_date', 'Tanggal awal (YYYY-MM-DD). Default: hari ini', { type: 'string', format: 'date' }),
          query('end_date', 'Tanggal akhir (YYYY-MM-DD). Default: start_date. Maks 62 hari', { type: 'string', format: 'date' }),
        ],
        responses: {
          ...ok('Berhasil', envelope('activities', ref('AttendanceActivity'))),
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/v2/talenta/v3/time-off/policies/users/{userId}': {
      get: {
        tags: ['Time Off'],
        summary: 'Time off policies per user (v3)',
        description:
          'Kebijakan cuti/sakit yang berlaku untuk pegawai. Ini **kebijakan**, bukan riwayat cuti. Berguna untuk memetakan `policy_code` (mis. SKT, CT) ke nama cuti. ' +
          'Path lengkap (prefix `/v2/talenta`) ASUMSI, karena dokumentasi hanya menulis `/v3/time-off/...`.',
        parameters: [pathParam('userId', 'user_id atau employee_id pegawai', 2001)],
        responses: {
          ...ok('Berhasil', envelope('policies', ref('TimeOffPolicy'))),
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      hmac: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Format asli: hmac username="<client_id>", algorithm="hmac-sha256", headers="date request-line", signature="..." (plus header Date). Mock tidak memverifikasi tanda tangan.',
      },
    },
    responses: {
      Unauthorized: { description: 'Header Authorization/Date tidak ada (hanya jika REQUIRE_AUTH=true)', content: { 'application/json': { schema: ref('Error') } } },
      NotFound: { description: 'Data tidak ditemukan', content: { 'application/json': { schema: ref('Error') } } },
      BadRequest: { description: 'Parameter tidak valid', content: { 'application/json': { schema: ref('Error') } } },
    },
    schemas: {
      Error: obj({ message: str }),
      Employee: obj({
        user_id: int, sso_id: str, employee_id: str, first_name: str, last_name: str,
        branch_id: int, branch: str, organization_id: int, organization_name: str,
        company_id: int, job_position_id: int, employment_status: str,
        join_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', description: 'Tanggal berakhir kontrak; kosong jika permanen' },
        resign_date: str, barcode: str, email: str, gender: str, mobile_phone: str,
        created_at: str, updated_at: str,
      }),
      Organization: obj({ id: int, name: str, parent_id: int, parent_name: str }),
      EmploymentStatus: obj({ id: int, name: str, is_end_date: bool }),
      LiveAttendanceLocation: obj({
        id: int, company_id: int, setting_id: int, name: str, radius: int,
        latitude: str, longitude: str, address: str, created_date: str, updated_date: str,
      }),
      AttendanceHistoryItem: obj({
        id: int,
        type: { type: 'string', description: 'clock_in, clock_out, atau timeoff (mock)' },
        time: str, clock_datetime: str, has_location: bool, show_detail: bool,
        date: { type: 'string', format: 'date' },
        shift: str, schedule_in: str, schedule_out: str, checkin: str, checkout: str, overtime: str,
        attendance_code: { type: 'string', description: 'H = hadir; kosong = tidak ada kehadiran' },
        timeoff_code: str, timeoff_name: str, overnight: bool, branch: int, barcode: str, source: str,
      }),
      AttendanceActivity: obj({
        id: int, id_employee: str, employee_id_fk: int, organisation_user_id: int,
        full_name: str, job: str, branch: str,
        date: { type: 'string', format: 'date' },
        schedule_date: { type: 'string', format: 'date' },
        time: str, type: { type: 'string', description: 'Clock In atau Clock Out' },
        status: str, description: str,
        location_coordinate: { type: 'string', description: '"lat,lon"', example: '-6.209403,106.820889' },
        location_name: str, mobile_flag: str,
      }),
      TimeOffPolicy: obj({
        id: int, company_id: int, policy_name: str, policy_code: str, hourly_conversion: str,
        policy_flag: int, use_block_leave: int, effective_date: str,
        policy_expired_date: { type: 'string', nullable: true },
        policy_description: str, balance_type: str, emerge_type: str,
        minute_request_increment: { type: 'integer', nullable: true },
        hour_request_increment: { type: 'integer', nullable: true },
        country_code: { type: 'string', nullable: true },
      }),
    },
  },
}
