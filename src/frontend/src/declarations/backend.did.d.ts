/* eslint-disable */
// @ts-nocheck
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type Role = { 'admin': null } | { 'gatekeeper': null } | { 'employee': null };
export type ShiftType = { 'day': null } | { 'night': null } | { 'both': null };
export type AttendanceStatus = { 'pending': null } | { 'approved': null } | { 'rejected': null };
export type MarkedBy = { 'gatekeeper': null } | { 'admin': null } | { 'self_': null };

export interface Employee {
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

export interface AttendanceRecord {
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

export interface BiometricCredential {
  credentialId: string;
  employeeId: bigint;
}

export interface _SERVICE {
  login: ActorMethod<[string, string], [] | [LoginResult]>;
  changePassword: ActorMethod<[string, string, string], boolean>;
  addEmployee: ActorMethod<[string, string, string, string, string, Role, number, ShiftType], [] | [bigint]>;
  updateEmployee: ActorMethod<[string, bigint, string, number, ShiftType], boolean>;
  deleteEmployee: ActorMethod<[string, bigint], boolean>;
  getActiveEmployees: ActorMethod<[string], Employee[]>;
  getAllEmployees: ActorMethod<[string], Employee[]>;
  lookupEmployee: ActorMethod<[string, bigint], [] | [Employee]>;
  setRoster: ActorMethod<[string, bigint, string, ShiftType], boolean>;
  getRosterByMonth: ActorMethod<[string, string], RosterEntry[]>;
  markAttendance: ActorMethod<[string, bigint, string, bigint, boolean], [] | [bigint]>;
  checkOut: ActorMethod<[string, bigint, bigint], boolean>;
  approveAttendance: ActorMethod<[string, bigint, boolean], boolean>;
  getPendingAttendance: ActorMethod<[string], AttendanceRecord[]>;
  getMyAttendance: ActorMethod<[string, string], AttendanceRecord[]>;
  getAttendanceByMonth: ActorMethod<[string, string], AttendanceRecord[]>;
  getTodayAttendance: ActorMethod<[string, string], AttendanceRecord[]>;
  getSalaryReport: ActorMethod<[string, string], SalaryReport[]>;
  validateSession: ActorMethod<[string], boolean>;
  addBiometricCredential: ActorMethod<[string, bigint, string], boolean>;
  getBiometricCredentials: ActorMethod<[string], BiometricCredential[]>;
  lookupByBiometric: ActorMethod<[string, string], [] | [bigint]>;
  removeBiometricCredential: ActorMethod<[string, bigint], boolean>;
}

export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
