import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export type Role = { admin: null } | { gatekeeper: null } | { employee: null };
export type ShiftType = { day: null } | { night: null } | { both: null };
export type AttendanceStatus = { pending: null } | { approved: null } | { rejected: null };
export type MarkedBy = { gatekeeper: null } | { admin: null } | { self_: null };

// Internal stable type (used by backend storage)
export interface Employee {
    id: bigint;
    name: string;
    username: string;
    passwordHash: string;
    role: Role;
    hourlyRate: number;
    shiftType: ShiftType;
    isActive: boolean;
}

// Extended API type returned by query functions
export interface EmployeeInfo {
    id: bigint;
    customId: string;
    name: string;
    username: string;
    passwordHash: string;
    role: Role;
    hourlyRate: number;
    shiftType: ShiftType;
    isActive: boolean;
}

// Extended attendance type returned by query functions
export interface AttendanceInfo {
    id: bigint;
    employeeId: bigint;
    date: string;
    checkIn: [] | [bigint];
    checkOut: [] | [bigint];
    status: AttendanceStatus;
    markedBy: MarkedBy;
    approvedBy: [] | [string];
    netHours: number;
}

export interface RosterEntry {
    employeeId: bigint;
    date: string;
    shiftType: ShiftType;
}

export interface LoginResult {
    token: string;
    role: Role;
    employeeId: bigint;
    name: string;
}

export interface SalaryReport {
    employeeId: bigint;
    name: string;
    totalHours: number;
    hourlyRate: number;
    totalSalary: number;
}

export interface backendInterface {
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    login(username: string, password: string): Promise<[] | [LoginResult]>;
    changePassword(token: string, oldPassword: string, newPassword: string): Promise<boolean>;
    addEmployee(token: string, customId: string, name: string, username: string, password: string, role: Role, hourlyRate: number, shiftType: ShiftType): Promise<[] | [bigint]>;
    updateEmployee(token: string, id: bigint, name: string, hourlyRate: number, shiftType: ShiftType): Promise<boolean>;
    deleteEmployee(token: string, id: bigint): Promise<boolean>;
    getActiveEmployees(token: string): Promise<EmployeeInfo[]>;
    getAllEmployees(token: string): Promise<EmployeeInfo[]>;
    lookupEmployee(token: string, employeeId: bigint): Promise<[] | [EmployeeInfo]>;
    setRoster(token: string, employeeId: bigint, date: string, shiftType: ShiftType): Promise<boolean>;
    getRosterByMonth(token: string, yearMonth: string): Promise<RosterEntry[]>;
    markAttendance(token: string, employeeId: bigint, date: string, checkIn: bigint, isSelf: boolean): Promise<[] | [bigint]>;
    checkOut(token: string, recordId: bigint, checkOutTime: bigint): Promise<boolean>;
    approveAttendance(token: string, recordId: bigint, approved: boolean): Promise<boolean>;
    getPendingAttendance(token: string): Promise<AttendanceInfo[]>;
    getMyAttendance(token: string, yearMonth: string): Promise<AttendanceInfo[]>;
    getAttendanceByMonth(token: string, yearMonth: string): Promise<AttendanceInfo[]>;
    getTodayAttendance(token: string, date: string): Promise<AttendanceInfo[]>;
    getSalaryReport(token: string, yearMonth: string): Promise<SalaryReport[]>;
}
