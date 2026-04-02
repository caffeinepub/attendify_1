/* eslint-disable */
// @ts-nocheck
import { IDL } from '@icp-sdk/core/candid';

const Role = IDL.Variant({ admin: IDL.Null, gatekeeper: IDL.Null, employee: IDL.Null });
const ShiftType = IDL.Variant({ day: IDL.Null, night: IDL.Null, both: IDL.Null });
const AttendanceStatus = IDL.Variant({ pending: IDL.Null, approved: IDL.Null, rejected: IDL.Null });
const MarkedBy = IDL.Variant({ gatekeeper: IDL.Null, admin: IDL.Null, self_: IDL.Null });

const Employee = IDL.Record({
  id: IDL.Nat,
  customId: IDL.Text,
  name: IDL.Text,
  username: IDL.Text,
  passwordHash: IDL.Text,
  role: Role,
  hourlyRate: IDL.Float64,
  shiftType: ShiftType,
  isActive: IDL.Bool,
});

const AttendanceRecord = IDL.Record({
  id: IDL.Nat,
  employeeId: IDL.Nat,
  date: IDL.Text,
  checkIn: IDL.Opt(IDL.Int),
  checkOut: IDL.Opt(IDL.Int),
  status: AttendanceStatus,
  markedBy: MarkedBy,
  approvedBy: IDL.Opt(IDL.Text),
  netHours: IDL.Float64,
});

const RosterEntry = IDL.Record({
  employeeId: IDL.Nat,
  date: IDL.Text,
  shiftType: ShiftType,
});

const LoginResult = IDL.Record({
  token: IDL.Text,
  role: Role,
  employeeId: IDL.Nat,
  name: IDL.Text,
});

const SalaryReport = IDL.Record({
  employeeId: IDL.Nat,
  name: IDL.Text,
  totalHours: IDL.Float64,
  hourlyRate: IDL.Float64,
  totalSalary: IDL.Float64,
});

const BiometricCredential = IDL.Record({
  credentialId: IDL.Text,
  employeeId: IDL.Nat,
});

export const idlService = IDL.Service({
  login: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(LoginResult)], []),
  changePassword: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
  addEmployee: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, Role, IDL.Float64, ShiftType], [IDL.Opt(IDL.Nat)], []),
  updateEmployee: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Float64, ShiftType], [IDL.Bool], []),
  deleteEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
  reactivateEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
  getActiveEmployees: IDL.Func([IDL.Text], [IDL.Vec(Employee)], ['query']),
  getAllEmployees: IDL.Func([IDL.Text], [IDL.Vec(Employee)], ['query']),
  lookupEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Opt(Employee)], ['query']),
  setRoster: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, ShiftType], [IDL.Bool], []),
  getRosterByMonth: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(RosterEntry)], ['query']),
  markAttendance: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Int, IDL.Bool], [IDL.Opt(IDL.Nat)], []),
  checkOut: IDL.Func([IDL.Text, IDL.Nat, IDL.Int], [IDL.Bool], []),
  approveAttendance: IDL.Func([IDL.Text, IDL.Nat, IDL.Bool], [IDL.Bool], []),
  getPendingAttendance: IDL.Func([IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
  getMyAttendance: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
  getAttendanceByMonth: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
  getTodayAttendance: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
  getSalaryReport: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(SalaryReport)], ['query']),
  validateSession: IDL.Func([IDL.Text], [IDL.Bool], []),
  addBiometricCredential: IDL.Func([IDL.Text, IDL.Nat, IDL.Text], [IDL.Bool], []),
  getBiometricCredentials: IDL.Func([IDL.Text], [IDL.Vec(BiometricCredential)], ['query']),
  lookupByBiometric: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(IDL.Nat)], ['query']),
  removeBiometricCredential: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const Role = IDL.Variant({ admin: IDL.Null, gatekeeper: IDL.Null, employee: IDL.Null });
  const ShiftType = IDL.Variant({ day: IDL.Null, night: IDL.Null, both: IDL.Null });
  const AttendanceStatus = IDL.Variant({ pending: IDL.Null, approved: IDL.Null, rejected: IDL.Null });
  const MarkedBy = IDL.Variant({ gatekeeper: IDL.Null, admin: IDL.Null, self_: IDL.Null });
  const Employee = IDL.Record({
    id: IDL.Nat,
    customId: IDL.Text,
    name: IDL.Text,
    username: IDL.Text,
    passwordHash: IDL.Text,
    role: Role,
    hourlyRate: IDL.Float64,
    shiftType: ShiftType,
    isActive: IDL.Bool,
  });
  const AttendanceRecord = IDL.Record({
    id: IDL.Nat,
    employeeId: IDL.Nat,
    date: IDL.Text,
    checkIn: IDL.Opt(IDL.Int),
    checkOut: IDL.Opt(IDL.Int),
    status: AttendanceStatus,
    markedBy: MarkedBy,
    approvedBy: IDL.Opt(IDL.Text),
    netHours: IDL.Float64,
  });
  const RosterEntry = IDL.Record({
    employeeId: IDL.Nat,
    date: IDL.Text,
    shiftType: ShiftType,
  });
  const LoginResult = IDL.Record({
    token: IDL.Text,
    role: Role,
    employeeId: IDL.Nat,
    name: IDL.Text,
  });
  const SalaryReport = IDL.Record({
    employeeId: IDL.Nat,
    name: IDL.Text,
    totalHours: IDL.Float64,
    hourlyRate: IDL.Float64,
    totalSalary: IDL.Float64,
  });
  const BiometricCredential = IDL.Record({
    credentialId: IDL.Text,
    employeeId: IDL.Nat,
  });
  return IDL.Service({
    login: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(LoginResult)], []),
    changePassword: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    addEmployee: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, Role, IDL.Float64, ShiftType], [IDL.Opt(IDL.Nat)], []),
    updateEmployee: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Float64, ShiftType], [IDL.Bool], []),
    deleteEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
  reactivateEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
    getActiveEmployees: IDL.Func([IDL.Text], [IDL.Vec(Employee)], ['query']),
    getAllEmployees: IDL.Func([IDL.Text], [IDL.Vec(Employee)], ['query']),
    lookupEmployee: IDL.Func([IDL.Text, IDL.Nat], [IDL.Opt(Employee)], ['query']),
    setRoster: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, ShiftType], [IDL.Bool], []),
    getRosterByMonth: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(RosterEntry)], ['query']),
    markAttendance: IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Int, IDL.Bool], [IDL.Opt(IDL.Nat)], []),
    checkOut: IDL.Func([IDL.Text, IDL.Nat, IDL.Int], [IDL.Bool], []),
    approveAttendance: IDL.Func([IDL.Text, IDL.Nat, IDL.Bool], [IDL.Bool], []),
    getPendingAttendance: IDL.Func([IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
    getMyAttendance: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
    getAttendanceByMonth: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
    getTodayAttendance: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(AttendanceRecord)], ['query']),
    getSalaryReport: IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(SalaryReport)], ['query']),
    validateSession: IDL.Func([IDL.Text], [IDL.Bool], []),
    addBiometricCredential: IDL.Func([IDL.Text, IDL.Nat, IDL.Text], [IDL.Bool], []),
    getBiometricCredentials: IDL.Func([IDL.Text], [IDL.Vec(BiometricCredential)], ['query']),
    lookupByBiometric: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(IDL.Nat)], ['query']),
    removeBiometricCredential: IDL.Func([IDL.Text, IDL.Nat], [IDL.Bool], []),
  });
};

export const init = ({ IDL }) => { return []; };
