// Dummy data untuk mock Talenta API.
// Semua deterministik (tidak random), jadi hasil selalu sama setiap request.
// Tanggal kontrak dibuat RELATIF terhadap bulan berjalan, supaya dashboard
// "kontrak berakhir bulan ini" selalu punya data kapan pun API dijalankan.

export const COMPANY_ID = 3620

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

function inMonth(offset: number, day: number): string {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return ymd(first.getFullYear(), first.getMonth() + 1, Math.min(day, last))
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = []
  const e = new Date(end + 'T00:00:00Z')
  for (let d = new Date(start + 'T00:00:00Z'); d <= e && out.length < 62; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

// ---------- Organisasi (endpoint: company/{id}/organization) ----------
export const organizations = [
  { id: 54000, name: 'Operations', parent_id: 53000, parent_name: 'Headquarter' },
  { id: 54001, name: 'Finance & HR', parent_id: 53000, parent_name: 'Headquarter' },
  { id: 55001, name: 'Product', parent_id: 54000, parent_name: 'Operations' },
  { id: 55002, name: 'Sales', parent_id: 54000, parent_name: 'Operations' },
  { id: 55003, name: 'Technical', parent_id: 54000, parent_name: 'Operations' },
  { id: 55004, name: 'Finance', parent_id: 54001, parent_name: 'Finance & HR' },
]

const JOB_BY_ORG: Record<number, string> = {
  55001: 'Product Specialist',
  55002: 'Sales Executive',
  55003: 'Technical Engineer',
  55004: 'Finance Staff',
}
const FIELD_TEAMS = [55001, 55002, 55003] // Product, Sales, Technical

// ---------- Status pegawai (endpoint: company/me/employment-status) ----------
export const employmentStatuses = [
  { id: 961, name: 'Permanent', is_end_date: false },
  { id: 962, name: 'Contract', is_end_date: true },
  { id: 963, name: 'Probation', is_end_date: true },
]

// ---------- Pegawai (endpoint: v3/employees) ----------
type Raw = { uid: number; first: string; last: string; org: number; status: string; end: string }
const raw: Raw[] = [
  { uid: 2001, first: 'Budi', last: 'Santoso', org: 55002, status: 'Permanent', end: '' },
  { uid: 2002, first: 'Dewi', last: 'Lestari', org: 55002, status: 'Contract', end: inMonth(0, 31) }, // habis bulan ini
  { uid: 2003, first: 'Rudi', last: 'Hartono', org: 55002, status: 'Probation', end: inMonth(1, 15) },
  { uid: 2004, first: 'Sari', last: 'Wulandari', org: 55001, status: 'Permanent', end: '' },
  { uid: 2005, first: 'Andi', last: 'Pratama', org: 55001, status: 'Contract', end: inMonth(0, 28) }, // habis bulan ini
  { uid: 2006, first: 'Maya', last: 'Putri', org: 55001, status: 'Contract', end: inMonth(2, 5) },
  { uid: 2007, first: 'Eko', last: 'Prasetyo', org: 55003, status: 'Permanent', end: '' },
  { uid: 2008, first: 'Fajar', last: 'Nugroho', org: 55003, status: 'Contract', end: inMonth(0, 31) }, // habis bulan ini
  { uid: 2009, first: 'Lina', last: 'Marlina', org: 55003, status: 'Permanent', end: '' },
  { uid: 2010, first: 'Hendra', last: 'Wijaya', org: 55003, status: 'Probation', end: inMonth(1, 1) },
  { uid: 2011, first: 'Rina', last: 'Anggraini', org: 55004, status: 'Permanent', end: '' },
  { uid: 2012, first: 'Tono', last: 'Sutrisno', org: 55004, status: 'Contract', end: inMonth(1, 20) },
]

export const employees = raw.map((r) => {
  const org = organizations.find((o) => o.id === r.org)!
  return {
    user_id: r.uid,
    sso_id: '',
    employee_id: `EMP-${String(r.uid - 2000).padStart(3, '0')}`,
    first_name: r.first,
    last_name: r.last,
    branch_id: 2078,
    branch: 'Jakarta',
    organization_id: org.id,
    organization_name: org.name,
    company_id: COMPANY_ID,
    job_position_id: 55000 + (r.uid % 10),
    employment_status: r.status,
    join_date: '2024-01-15',
    end_date: r.end,
    resign_date: '',
    barcode: `BC${r.uid}`,
    email: `${r.first.toLowerCase()}@example.test`,
    gender: r.uid % 2 === 0 ? 'Female' : 'Male',
    mobile_phone: `0812000${r.uid}`,
    created_at: '2024-01-15 09:00:00',
    updated_at: '2026-01-01 09:00:00',
  }
})
export type Employee = (typeof employees)[number]

export function findUser(idOrCode: string): Employee | undefined {
  return employees.find((e) => String(e.user_id) === idOrCode || e.employee_id === idOrCode)
}

// ---------- Lokasi live attendance (endpoint: live-attendance/location) ----------
const OFFICE = { name: 'Kantor Jakarta', lat: -6.2, lon: 106.816666, address: 'Jl. Contoh No. 1, Jakarta Pusat' }
const CLIENT = { name: 'Klien PT Maju Jaya', lat: -6.209403, lon: 106.8208889, address: 'Jl. Klien No. 5, Jakarta Pusat' }

export function liveLocations(e: Employee) {
  const spots = FIELD_TEAMS.includes(e.organization_id) ? [OFFICE, CLIENT] : [OFFICE]
  return spots.map((s, i) => ({
    id: e.user_id * 10 + i,
    company_id: COMPANY_ID,
    setting_id: 8724,
    name: s.name,
    radius: 200,
    latitude: String(s.lat),
    longitude: String(s.lon),
    address: s.address,
    created_date: '2025-01-01 09:00:00',
    updated_date: '2025-01-01 09:00:00',
  }))
}

// ---------- Kebijakan time off (endpoint: v3/time-off/policies/users/{id}) ----------
export const timeOffPolicies = [
  { id: 50141, policy_name: 'Cuti Tahunan', policy_code: 'CT', balance_type: 'Fixed Balance', emerge_type: 'Yearly' },
  { id: 50142, policy_name: 'Sakit', policy_code: 'SKT', balance_type: 'Unlimited', emerge_type: 'Monthly' },
  { id: 50143, policy_name: 'Cuti Bulanan', policy_code: 'CUPM1', balance_type: 'Fixed Balance', emerge_type: 'Monthly' },
].map((p) => ({
  id: p.id,
  company_id: COMPANY_ID,
  policy_name: p.policy_name,
  policy_code: p.policy_code,
  hourly_conversion: '0',
  policy_flag: 0,
  use_block_leave: 0,
  effective_date: '2025-01-01',
  policy_expired_date: null,
  policy_description: `${p.policy_name} (data dummy)`,
  balance_type: p.balance_type,
  emerge_type: p.emerge_type,
  minute_request_increment: null,
  hour_request_increment: null,
  country_code: null,
}))

// ---------- Status kehadiran harian ----------
export type DayStatus = 'hadir' | 'sakit' | 'cuti' | 'tidak_absen'

export function statusFor(userId: number, date: string): DayStatus {
  const day = Number(date.slice(8, 10))
  const n = (userId * 31 + day * 17) % 10
  if (n === 0) return 'sakit'
  if (n === 1) return 'cuti'
  if (n === 2) return 'tidak_absen'
  return 'hadir'
}

const clockIn = (uid: number) => `08:${pad(30 + (uid % 25))}`
const clockOut = (uid: number) => `17:${pad(uid % 50)}`

// ---------- Riwayat absen (endpoint: attendance/{userId}/history-list) ----------
// Asumsi mock: pegawai "tidak absen" => list KOSONG untuk hari itu.
// Semua hari dianggap hari kerja (weekend/libur tidak ditangani).
export function attendanceHistory(e: Employee, date: string) {
  const status = statusFor(e.user_id, date)
  const day = Number(date.slice(8, 10))
  const base = {
    date,
    shift: 'office',
    schedule_in: '09:00',
    schedule_out: '18:00',
    overtime: '00:00',
    overnight: false,
    branch: e.branch_id,
    barcode: e.barcode,
    source: 'mobile',
  }
  const id = e.user_id * 100000 + day * 10

  if (status === 'tidak_absen') return []

  if (status === 'sakit' || status === 'cuti') {
    return [
      {
        id,
        type: 'timeoff',
        time: '',
        clock_datetime: '',
        has_location: false,
        show_detail: false,
        ...base,
        checkin: '',
        checkout: '',
        attendance_code: '',
        timeoff_code: status === 'sakit' ? 'SKT' : 'CT',
        timeoff_name: status === 'sakit' ? 'Sakit' : 'Cuti Tahunan',
      },
    ]
  }

  const cin = clockIn(e.user_id)
  const cout = clockOut(e.user_id)
  return [
    {
      id, type: 'clock_in', time: cin, clock_datetime: `${date} ${cin}:00`,
      has_location: true, show_detail: true, ...base,
      checkin: cin, checkout: '', attendance_code: 'H', timeoff_code: '', timeoff_name: '',
    },
    {
      id: id + 1, type: 'clock_out', time: cout, clock_datetime: `${date} ${cout}:00`,
      has_location: true, show_detail: true, ...base,
      checkin: cin, checkout: cout, attendance_code: 'H', timeoff_code: '', timeoff_name: '',
    },
  ]
}

// ---------- Aktivitas absen + koordinat (TAMBAHAN, path endpoint belum pasti) ----------
// Dibutuhkan untuk tujuan 1 (visit di lokasi yang sama), karena history-list
// hanya punya has_location (true/false), tanpa koordinat.
export function attendanceActivities(date: string) {
  const day = Number(date.slice(8, 10))
  const out: object[] = []
  for (const e of employees) {
    if (statusFor(e.user_id, date) !== 'hadir') continue
    const visiting = FIELD_TEAMS.includes(e.organization_id) && day % 2 === 0 && e.user_id % 5 !== 0
    const spot = visiting ? CLIENT : OFFICE
    const jitter = ((e.user_id % 3) - 1) * 0.00005 // koordinat tidak persis sama
    const coord = `${(spot.lat + jitter).toFixed(6)},${(spot.lon - jitter).toFixed(6)}`
    for (const [k, type, time] of [
      [0, 'Clock In', `${clockIn(e.user_id)}:00`],
      [1, 'Clock Out', `${clockOut(e.user_id)}:00`],
    ] as const) {
      out.push({
        id: e.user_id * 1000 + day * 10 + k,
        id_employee: e.employee_id,
        employee_id_fk: e.user_id,
        organisation_user_id: e.user_id,
        full_name: `${e.first_name} ${e.last_name}`,
        job: JOB_BY_ORG[e.organization_id],
        branch: e.branch,
        date,
        schedule_date: date,
        time,
        type,
        status: 'Approved',
        description: '',
        location_coordinate: coord,
        location_name: visiting ? CLIENT.name : OFFICE.name,
        mobile_flag: 'Mobile App',
        device_id: null,
        face_accuracy: null,
        mask: null,
        temperature: null,
      photo: { id: e.user_id * 1000 + day * 10 + k, is_image: true, name_file: null, url: null },
      })
    }
  }
  return out
}
