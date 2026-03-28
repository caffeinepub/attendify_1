// localStorage data layer for Attendify

export interface User {
  id: string;
  username: string;
  password: string;
  role: "admin" | "gatekeeper" | "employee";
  name: string;
  employeeId: string;
  hourlyRate: number;
  shiftType: "day" | "night" | "rotational";
  active: boolean;
  mobile?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalHours?: number;
  lunchDeducted?: boolean;
  status: "pending" | "approved" | "rejected";
  markedBy: "gatekeeper" | "admin" | "self";
  approvedBy?: string;
  notes?: string;
}

export interface RosterEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftType: "day" | "night" | "rotational";
  startDate: string;
  endDate: string;
}

const USERS_KEY = "attendify_users";
const ATTENDANCE_KEY = "attendify_attendance";
const ROSTERS_KEY = "attendify_rosters";
const RECOVERY_KEY = "attendify_recovery_code";

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ATTND-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function seed() {
  const existing = localStorage.getItem(USERS_KEY);
  if (existing) return;

  const users: User[] = [
    {
      id: genId(),
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Administrator",
      employeeId: "ADM001",
      hourlyRate: 0,
      shiftType: "day",
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: genId(),
      username: "gatekeeper",
      password: "gate123",
      role: "gatekeeper",
      name: "Gate Keeper",
      employeeId: "GKP001",
      hourlyRate: 0,
      shiftType: "day",
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify([]));
  localStorage.setItem(ROSTERS_KEY, JSON.stringify([]));

  // Generate emergency recovery code on first seed
  if (!localStorage.getItem(RECOVERY_KEY)) {
    localStorage.setItem(RECOVERY_KEY, generateCode());
  }
}

seed();

// Recovery code
export function getRecoveryCode(): string {
  let code = localStorage.getItem(RECOVERY_KEY);
  if (!code) {
    code = generateCode();
    localStorage.setItem(RECOVERY_KEY, code);
  }
  return code;
}

export function resetAdminPasswordByCode(
  code: string,
  newPassword: string,
): boolean {
  const stored = localStorage.getItem(RECOVERY_KEY);
  if (!stored || stored.trim().toUpperCase() !== code.trim().toUpperCase())
    return false;
  const users = getUsers();
  const admin = users.find((u) => u.role === "admin");
  if (!admin) return false;
  updateUser(admin.id, { password: newPassword });
  return true;
}

// Users
export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username === username);
}

export function getActiveEmployees(): User[] {
  return getUsers().filter((u) => u.role === "employee" && !u.deletedAt);
}

export function addUser(data: Omit<User, "id" | "createdAt">): User {
  const users = getUsers();
  const user: User = {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

export function updateUser(id: string, updates: Partial<User>) {
  const users = getUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
  saveUsers(users);
}

// Attendance
export function getAttendance(): AttendanceRecord[] {
  return JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "[]");
}

export function saveAttendance(records: AttendanceRecord[]) {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
}

export function addAttendance(
  data: Omit<AttendanceRecord, "id">,
): AttendanceRecord {
  const records = getAttendance();
  const record: AttendanceRecord = { ...data, id: genId() };
  saveAttendance([...records, record]);
  return record;
}

export function updateAttendance(
  id: string,
  updates: Partial<AttendanceRecord>,
) {
  const records = getAttendance().map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  saveAttendance(records);
}

export function computeHours(
  checkIn: string,
  checkOut: string,
): { totalHours: number; lunchDeducted: boolean } {
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  let hours = (outMs - inMs) / 3600000;
  let lunchDeducted = false;
  if (hours < 11.5) {
    hours -= 0.5;
    lunchDeducted = true;
  }
  return {
    totalHours: Math.max(0, Math.round(hours * 100) / 100),
    lunchDeducted,
  };
}

// Rosters
export function getRosters(): RosterEntry[] {
  return JSON.parse(localStorage.getItem(ROSTERS_KEY) || "[]");
}

export function saveRosters(rosters: RosterEntry[]) {
  localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters));
}

export function addRoster(data: Omit<RosterEntry, "id">): RosterEntry {
  const rosters = getRosters();
  const roster: RosterEntry = { ...data, id: genId() };
  saveRosters([...rosters, roster]);
  return roster;
}

export function deleteRoster(id: string) {
  saveRosters(getRosters().filter((r) => r.id !== id));
}
