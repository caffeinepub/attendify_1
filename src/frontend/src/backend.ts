/* eslint-disable */
// @ts-nocheck

import { Actor, HttpAgent, type HttpAgentOptions, type ActorConfig, type Agent, type ActorSubclass } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { idlFactory, type _SERVICE } from "./declarations/backend.did";

export interface Some<T> { __kind__: "Some"; value: T; }
export interface None { __kind__: "None"; }
export type Option<T> = Some<T> | None;

export class ExternalBlob {
  _blob?: Uint8Array<ArrayBuffer> | null;
  directURL: string;
  onProgress?: (percentage: number) => void = undefined;
  private constructor(directURL: string, blob: Uint8Array<ArrayBuffer> | null) {
    if (blob) { this._blob = blob; }
    this.directURL = directURL;
  }
  static fromURL(url: string): ExternalBlob { return new ExternalBlob(url, null); }
  static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob {
    const url = URL.createObjectURL(new Blob([new Uint8Array(blob)], { type: 'application/octet-stream' }));
    return new ExternalBlob(url, blob);
  }
  public async getBytes(): Promise<Uint8Array<ArrayBuffer>> {
    if (this._blob) { return this._blob; }
    const response = await fetch(this.directURL);
    const blob = await response.blob();
    this._blob = new Uint8Array(await blob.arrayBuffer());
    return this._blob;
  }
  public getDirectURL(): string { return this.directURL; }
  public withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
    this.onProgress = onProgress;
    return this;
  }
}

export interface backendInterface {
  _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
  login(username: string, password: string): Promise<[] | [any]>;
  changePassword(token: string, oldPassword: string, newPassword: string): Promise<boolean>;
  addEmployee(token: string, customId: string, name: string, username: string, password: string, role: any, hourlyRate: number, shiftType: any): Promise<[] | [bigint]>;
  updateEmployee(token: string, id: bigint, name: string, hourlyRate: number, shiftType: any): Promise<boolean>;
  deleteEmployee(token: string, id: bigint): Promise<boolean>;
  getActiveEmployees(token: string): Promise<any[]>;
  getAllEmployees(token: string): Promise<any[]>;
  lookupEmployee(token: string, employeeId: bigint): Promise<[] | [any]>;
  setRoster(token: string, employeeId: bigint, date: string, shiftType: any): Promise<boolean>;
  getRosterByMonth(token: string, yearMonth: string): Promise<any[]>;
  markAttendance(token: string, employeeId: bigint, date: string, checkIn: bigint, isSelf: boolean): Promise<[] | [bigint]>;
  checkOut(token: string, recordId: bigint, checkOutTime: bigint): Promise<boolean>;
  approveAttendance(token: string, recordId: bigint, approved: boolean): Promise<boolean>;
  getPendingAttendance(token: string): Promise<any[]>;
  getMyAttendance(token: string, yearMonth: string): Promise<any[]>;
  getAttendanceByMonth(token: string, yearMonth: string): Promise<any[]>;
  getTodayAttendance(token: string, date: string): Promise<any[]>;
  getSalaryReport(token: string, yearMonth: string): Promise<any[]>;
}

export class Backend implements backendInterface {
  constructor(
    private actor: ActorSubclass<_SERVICE>,
    private _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
    private _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
    private processError?: (error: unknown) => never
  ) {}

  async _initializeAccessControlWithSecret(userSecret: string): Promise<void> {
    return (this.actor as any)._initializeAccessControlWithSecret(userSecret);
  }
  async login(username: string, password: string): Promise<[] | [any]> {
    return (this.actor as any).login(username, password);
  }
  async changePassword(token: string, oldPassword: string, newPassword: string): Promise<boolean> {
    return (this.actor as any).changePassword(token, oldPassword, newPassword);
  }
  async addEmployee(token: string, customId: string, name: string, username: string, password: string, role: any, hourlyRate: number, shiftType: any): Promise<[] | [bigint]> {
    return (this.actor as any).addEmployee(token, customId, name, username, password, role, hourlyRate, shiftType);
  }
  async updateEmployee(token: string, id: bigint, name: string, hourlyRate: number, shiftType: any): Promise<boolean> {
    return (this.actor as any).updateEmployee(token, id, name, hourlyRate, shiftType);
  }
  async deleteEmployee(token: string, id: bigint): Promise<boolean> {
    return (this.actor as any).deleteEmployee(token, id);
  }
  async getActiveEmployees(token: string): Promise<any[]> {
    return (this.actor as any).getActiveEmployees(token);
  }
  async getAllEmployees(token: string): Promise<any[]> {
    return (this.actor as any).getAllEmployees(token);
  }
  async lookupEmployee(token: string, employeeId: bigint): Promise<[] | [any]> {
    return (this.actor as any).lookupEmployee(token, employeeId);
  }
  async setRoster(token: string, employeeId: bigint, date: string, shiftType: any): Promise<boolean> {
    return (this.actor as any).setRoster(token, employeeId, date, shiftType);
  }
  async getRosterByMonth(token: string, yearMonth: string): Promise<any[]> {
    return (this.actor as any).getRosterByMonth(token, yearMonth);
  }
  async markAttendance(token: string, employeeId: bigint, date: string, checkIn: bigint, isSelf: boolean): Promise<[] | [bigint]> {
    return (this.actor as any).markAttendance(token, employeeId, date, checkIn, isSelf);
  }
  async checkOut(token: string, recordId: bigint, checkOutTime: bigint): Promise<boolean> {
    return (this.actor as any).checkOut(token, recordId, checkOutTime);
  }
  async approveAttendance(token: string, recordId: bigint, approved: boolean): Promise<boolean> {
    return (this.actor as any).approveAttendance(token, recordId, approved);
  }
  async getPendingAttendance(token: string): Promise<any[]> {
    return (this.actor as any).getPendingAttendance(token);
  }
  async getMyAttendance(token: string, yearMonth: string): Promise<any[]> {
    return (this.actor as any).getMyAttendance(token, yearMonth);
  }
  async getAttendanceByMonth(token: string, yearMonth: string): Promise<any[]> {
    return (this.actor as any).getAttendanceByMonth(token, yearMonth);
  }
  async getTodayAttendance(token: string, date: string): Promise<any[]> {
    return (this.actor as any).getTodayAttendance(token, date);
  }
  async getSalaryReport(token: string, yearMonth: string): Promise<any[]> {
    return (this.actor as any).getSalaryReport(token, yearMonth);
  }
}

export interface CreateActorOptions {
  agent?: Agent;
  agentOptions?: HttpAgentOptions;
  actorOptions?: ActorConfig;
  processError?: (error: unknown) => never;
}

export function createActor(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateActorOptions = {}
): Backend {
  const agent = options.agent || HttpAgent.createSync({ ...options.agentOptions });
  if (options.agent && options.agentOptions) {
    console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
  }
  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: canisterId,
    ...options.actorOptions,
  });
  return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
