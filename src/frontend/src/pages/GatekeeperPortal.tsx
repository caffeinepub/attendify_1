import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Fingerprint,
  Loader2,
  LogIn,
  LogOut,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

// ─── Helpers ────────────────────────────────────────────────────────────────
function statusToStr(status: any): string {
  if (status && "approved" in status) return "approved";
  if (status && "rejected" in status) return "rejected";
  return "pending";
}

function nsToFullTimeStr(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleTimeString();
}

function shiftToStr(shiftType: any): string {
  if (shiftType && "night" in shiftType) return "night";
  if (shiftType && "both" in shiftType) return "both";
  return "day";
}

function statusBadge(status: string) {
  if (status === "approved")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
      Pending
    </Badge>
  );
}

// ─── Biometric state machine ─────────────────────────────────────────────────
type BiometricState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "identified"; employee: any }
  | { kind: "not_registered" }
  | { kind: "success"; name: string };

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GatekeeperPortal() {
  const { auth, logout } = useAuth();
  const { actor: _actor, isFetching } = useActor();
  const actor = _actor as any;

  // Core data
  const [employees, setEmployees] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Manual attendance
  const [manualSearch, setManualSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [attendanceType, setAttendanceType] = useState<"in" | "out">("in");

  // Biometric
  const [biometricSupported] = useState(() => !!window.PublicKeyCredential);
  const [biometricState, setBiometricState] = useState<BiometricState>({
    kind: "idle",
  });
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Registration
  const [registeredMap, setRegisteredMap] = useState<Map<string, bigint>>(
    new Map(),
  ); // credentialId -> employeeId
  const [registeredEmpIds, setRegisteredEmpIds] = useState<Set<string>>(
    new Set(),
  ); // employeeId.toString()
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [regSearch, setRegSearch] = useState("");

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // ─── Data loading ──────────────────────────────────────────────────────────
  const reload = async () => {
    if (!actor || !auth) return;
    setLoadingData(true);
    try {
      const [emps, todayAtt, pending] = await Promise.all([
        actor.getActiveEmployees(auth.token),
        actor.getTodayAttendance(auth.token, today),
        actor.getPendingAttendance(auth.token),
      ]);
      setEmployees(emps);
      setTodayAttendance(todayAtt);
      setPendingApprovals(pending);
    } catch (err) {
      console.error("Error loading attendance data:", err);
    } finally {
      setLoadingData(false);
    }
    // Load biometric credentials separately so a failure doesn't block employees list
    try {
      const bioCreds = await actor.getBiometricCredentials(auth.token);
      const newMap = new Map<string, bigint>();
      const newEmpIds = new Set<string>();
      for (const cred of bioCreds) {
        newMap.set(cred.credentialId, cred.employeeId);
        newEmpIds.add(cred.employeeId.toString());
      }
      setRegisteredMap(newMap);
      setRegisteredEmpIds(newEmpIds);
    } catch (err) {
      console.error("Error loading biometric credentials:", err);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on actor
  useEffect(() => {
    if (actor && !isFetching) {
      reload();
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setCheckInTime(timeStr);
      setCheckOutTime(timeStr);
    }
  }, [actor, isFetching]);

  // ─── Manual helpers ────────────────────────────────────────────────────────
  const manualSearchResults =
    manualSearch.length >= 1
      ? employees.filter(
          (e: any) =>
            e.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
            e.customId?.toLowerCase().includes(manualSearch.toLowerCase()),
        )
      : employees;

  const buildTimestamp = (date: string, time: string): bigint =>
    BigInt(new Date(`${date}T${time}:00`).getTime()) * 1_000_000n;

  const handleMarkAttendance = async () => {
    if (!actor || !auth || !selectedEmp) {
      toast.error("Select an employee");
      return;
    }
    try {
      if (attendanceType === "in") {
        const ts = buildTimestamp(today, checkInTime);
        const result = await actor.markAttendance(
          auth.token,
          selectedEmp.id,
          today,
          ts,
          false,
        );
        if (result[0] != null) {
          toast.success(`Check-in recorded for ${selectedEmp.name}`);
        } else {
          toast.error("Already checked in or error occurred");
        }
      } else {
        const openRecord = todayAttendance.find(
          (a: any) =>
            a.employeeId.toString() === selectedEmp.id.toString() &&
            a.checkIn?.[0] != null &&
            a.checkOut?.[0] == null,
        );
        if (!openRecord) {
          toast.error("No open check-in record found for this employee");
          return;
        }
        const ts = buildTimestamp(today, checkOutTime);
        const ok = await actor.checkOut(auth.token, openRecord.id, ts);
        if (ok) {
          toast.success(`Check-out recorded for ${selectedEmp.name}`);
        } else {
          toast.error("Error recording check-out");
        }
      }
      setSelectedEmp(null);
      setManualSearch("");
      await reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    }
  };

  // ─── Approval handler ──────────────────────────────────────────────────────
  const handleApprove = async (record: any, approved: boolean) => {
    if (!actor || !auth) return;
    try {
      const ok = await actor.approveAttendance(auth.token, record.id, approved);
      if (ok) {
        toast.success(approved ? "Approved!" : "Rejected");
        await reload();
      } else {
        toast.error("Failed to update approval");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing approval");
    }
  };

  // ─── Biometric attendance (scan → identify) ────────────────────────────────
  const handleBiometricScan = async () => {
    if (!actor || !auth) return;
    setBiometricState({ kind: "scanning" });
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      // Build allowCredentials from all registered fingerprints on this device
      // This prevents Chrome from showing passkey picker and directly triggers device fingerprint
      const allowCredentials: PublicKeyCredentialDescriptor[] = Array.from(
        registeredMap.keys(),
      ).map((credId) => {
        // Convert base64url credentialId to ArrayBuffer
        const base64 = credId.replace(/-/g, "+").replace(/_/g, "/");
        const bin = atob(base64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return {
          type: "public-key" as const,
          id: buf.buffer,
          transports: ["internal"] as AuthenticatorTransport[],
        };
      });
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          allowCredentials:
            allowCredentials.length > 0 ? allowCredentials : undefined,
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        setBiometricState({ kind: "idle" });
        return;
      }

      const credentialId = credential.id;

      // First check local map for O(1) lookup
      let empId: bigint | undefined = registeredMap.get(credentialId);

      // Fallback: ask backend
      if (empId === undefined) {
        const result = await actor.lookupByBiometric(auth.token, credentialId);
        empId = result[0];
      }

      if (empId === undefined) {
        setBiometricState({ kind: "not_registered" });
        return;
      }

      const emp = employees.find(
        (e: any) => e.id.toString() === empId!.toString(),
      );
      if (!emp) {
        setBiometricState({ kind: "not_registered" });
        return;
      }

      setBiometricState({ kind: "identified", employee: emp });
    } catch (err) {
      console.error(err);
      setBiometricState({ kind: "idle" });
      toast.error("Biometric scan failed or cancelled");
    }
  };

  const handleBiometricMarkAttendance = async (attendType: "in" | "out") => {
    if (!actor || !auth || biometricState.kind !== "identified") return;
    const emp = biometricState.employee;
    try {
      if (attendType === "in") {
        const ts = BigInt(Date.now()) * 1_000_000n;
        const result = await actor.markAttendance(
          auth.token,
          emp.id,
          today,
          ts,
          false,
        );
        if (result[0] != null) {
          setBiometricState({ kind: "success", name: emp.name });
          toast.success(`Check-in recorded for ${emp.name}`);
        } else {
          toast.error("Already checked in or error occurred");
          setBiometricState({ kind: "idle" });
        }
      } else {
        const openRecord = todayAttendance.find(
          (a: any) =>
            a.employeeId.toString() === emp.id.toString() &&
            a.checkIn?.[0] != null &&
            a.checkOut?.[0] == null,
        );
        if (!openRecord) {
          toast.error("No open check-in found for this employee");
          setBiometricState({ kind: "idle" });
          return;
        }
        const ts = BigInt(Date.now()) * 1_000_000n;
        const ok = await actor.checkOut(auth.token, openRecord.id, ts);
        if (ok) {
          setBiometricState({ kind: "success", name: emp.name });
          toast.success(`Check-out recorded for ${emp.name}`);
        } else {
          toast.error("Error recording check-out");
          setBiometricState({ kind: "idle" });
        }
      }
      await reload();
      // Auto-reset after 2s
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(
        () => setBiometricState({ kind: "idle" }),
        2500,
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
      setBiometricState({ kind: "idle" });
    }
  };

  // ─── Fingerprint registration ──────────────────────────────────────────────
  const handleRegisterFingerprint = async (emp: any) => {
    if (!actor || !auth) return;
    setRegisteringId(emp.id.toString());
    try {
      const empIdBytes = new TextEncoder().encode(emp.id.toString());
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Attendify" },
          user: {
            id: empIdBytes,
            name: emp.username,
            displayName: emp.name,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "discouraged",
            requireResidentKey: false,
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (credential) {
        const credentialId = credential.id;
        const ok = await actor.addBiometricCredential(
          auth.token,
          emp.id,
          credentialId,
        );
        if (ok) {
          toast.success(`Fingerprint registered for ${emp.name}`);
          await reload();
        } else {
          toast.error("Failed to save fingerprint");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Fingerprint registration failed or cancelled");
    } finally {
      setRegisteringId(null);
    }
  };

  const handleRemoveFingerprint = async (emp: any) => {
    if (!actor || !auth) return;
    setRemovingId(emp.id.toString());
    try {
      const ok = await actor.removeBiometricCredential(auth.token, emp.id);
      if (ok) {
        toast.success(`Fingerprint removed for ${emp.name}`);
        await reload();
      } else {
        toast.error("Failed to remove fingerprint");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error removing fingerprint");
    } finally {
      setRemovingId(null);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const regSearchResults =
    regSearch.length >= 1
      ? employees.filter(
          (e: any) =>
            e.name.toLowerCase().includes(regSearch.toLowerCase()) ||
            e.customId?.toLowerCase().includes(regSearch.toLowerCase()),
        )
      : employees;

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (isFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gatekeeper-gradient flex items-center justify-center text-white font-black">
            G
          </div>
          <div>
            <div className="font-bold">Gatekeeper Portal</div>
            <div className="text-xs text-muted-foreground">{auth?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            {pendingApprovals.length} Pending
          </Badge>
          {loadingData && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-ocid="gatekeeper.logout_button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="biometric">
          <TabsList
            className="mb-6 w-full md:w-auto"
            data-ocid="gatekeeper.tab"
          >
            <TabsTrigger value="biometric">Biometric</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="today">Today's List</TabsTrigger>
          </TabsList>

          {/* ══════════════════ BIOMETRIC TAB ══════════════════ */}
          <TabsContent value="biometric">
            <Tabs defaultValue="attendance">
              {/* Segmented control pills */}
              <TabsList className="mb-6 bg-orange-50 border border-orange-200 rounded-full p-1 h-auto">
                <TabsTrigger
                  value="attendance"
                  className="rounded-full px-5 py-1.5 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow"
                  data-ocid="biometric.attendance.tab"
                >
                  Attendance
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-full px-5 py-1.5 text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow"
                  data-ocid="biometric.register.tab"
                >
                  Register Fingerprint
                </TabsTrigger>
              </TabsList>

              {/* ── Sub-tab: Attendance ── */}
              <TabsContent value="attendance">
                {!biometricSupported ? (
                  <Card className="border-0 shadow-card max-w-md mx-auto">
                    <CardContent className="p-8 text-center space-y-4">
                      <ShieldAlert className="w-14 h-14 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-bold text-lg mb-1">
                          Biometric Not Supported
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          This browser or device does not support fingerprint
                          scanning. Use Manual Attendance tab.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="max-w-sm mx-auto space-y-6">
                    {/* Main Fingerprint Scanner UI */}
                    <Card className="border-0 shadow-xl overflow-hidden">
                      <div className="h-2 gatekeeper-gradient" />
                      <CardContent className="p-8 text-center space-y-6">
                        <AnimatePresence mode="wait">
                          {biometricState.kind === "idle" && (
                            <motion.div
                              key="idle"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="space-y-4"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                Fingerprint se attendance lagayein
                              </div>
                              <motion.button
                                type="button"
                                onClick={handleBiometricScan}
                                className="relative mx-auto block w-36 h-36 rounded-full gatekeeper-gradient shadow-2xl focus:outline-none focus:ring-4 focus:ring-orange-300"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.95 }}
                                data-ocid="biometric.canvas_target"
                              >
                                <Fingerprint className="absolute inset-0 m-auto w-20 h-20 text-white drop-shadow-lg" />
                              </motion.button>
                              <p className="text-xs text-muted-foreground">
                                Button dabayein aur fingerprint scan karo
                                <br />
                                Employee automatically identify ho jaayega
                              </p>
                            </motion.div>
                          )}

                          {biometricState.kind === "scanning" && (
                            <motion.div
                              key="scanning"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-5 py-4"
                            >
                              <div className="relative mx-auto w-36 h-36 rounded-full bg-orange-50 border-4 border-orange-300 flex items-center justify-center">
                                <motion.div
                                  className="absolute inset-0 rounded-full border-4 border-orange-400"
                                  animate={{
                                    scale: [1, 1.15, 1],
                                    opacity: [1, 0, 1],
                                  }}
                                  transition={{
                                    repeat: Number.POSITIVE_INFINITY,
                                    duration: 1.4,
                                  }}
                                />
                                <Fingerprint className="w-20 h-20 text-orange-400" />
                              </div>
                              <div className="font-semibold text-orange-600">
                                Scanning...
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Phone ka fingerprint sensor touch karein
                              </p>
                            </motion.div>
                          )}

                          {biometricState.kind === "identified" && (
                            <motion.div
                              key="identified"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="space-y-5"
                            >
                              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <UserCheck className="w-8 h-8 text-green-600" />
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                <div className="text-xs text-green-600 font-medium mb-1">
                                  Employee Identified
                                </div>
                                <div className="text-xl font-bold">
                                  {biometricState.employee.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID:{" "}
                                  {biometricState.employee.customId ||
                                    biometricState.employee.id.toString()}
                                  {" · "}
                                  {shiftToStr(
                                    biometricState.employee.shiftType,
                                  )}{" "}
                                  shift
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    handleBiometricMarkAttendance("in");
                                  }}
                                  data-ocid="biometric.checkin_button"
                                >
                                  <LogIn className="w-4 h-4 mr-1.5" /> Check In
                                </Button>
                                <Button
                                  className="flex-1"
                                  variant="outline"
                                  onClick={() => {
                                    handleBiometricMarkAttendance("out");
                                  }}
                                  data-ocid="biometric.checkout_button"
                                >
                                  <LogOut className="w-4 h-4 mr-1.5" /> Check
                                  Out
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() =>
                                  setBiometricState({ kind: "idle" })
                                }
                              >
                                Cancel
                              </Button>
                            </motion.div>
                          )}

                          {biometricState.kind === "not_registered" && (
                            <motion.div
                              key="not_registered"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-4"
                              data-ocid="biometric.error_state"
                            >
                              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                                <UserX className="w-8 h-8 text-orange-500" />
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <div className="font-semibold text-orange-700">
                                  Fingerprint Registered Nahi Hai
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Yeh fingerprint kisi employee se linked nahi
                                  hai. Register Fingerprint tab mein register
                                  karein ya neeche Manual Entry use karein.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  className="flex-1"
                                  variant="outline"
                                  onClick={() =>
                                    setBiometricState({ kind: "idle" })
                                  }
                                >
                                  Try Again
                                </Button>
                                <Button
                                  className="flex-1"
                                  onClick={() => {
                                    setBiometricState({ kind: "idle" });
                                    setShowManualFallback(true);
                                  }}
                                  data-ocid="biometric.manual_fallback_button"
                                >
                                  Manual Entry
                                </Button>
                              </div>
                            </motion.div>
                          )}

                          {biometricState.kind === "success" && (
                            <motion.div
                              key="success"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-4 py-4"
                              data-ocid="biometric.success_state"
                            >
                              <motion.div
                                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <CheckCircle className="w-10 h-10 text-white" />
                              </motion.div>
                              <div className="font-bold text-lg text-green-700">
                                Attendance Lagi!
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {biometricState.name}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    {/* Manual Fallback Collapsible */}
                    <div className="border rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowManualFallback((v) => !v)}
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
                        data-ocid="biometric.manual_fallback_button"
                      >
                        <span>Manual Entry (Fallback)</span>
                        <span className="text-muted-foreground">
                          {showManualFallback ? "▲" : "▼"}
                        </span>
                      </button>
                      <AnimatePresence>
                        {showManualFallback && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <ManualEntryForm
                              employees={employees}
                              todayAttendance={todayAttendance}
                              today={today}
                              onSuccess={reload}
                              actor={actor}
                              auth={auth}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Sub-tab: Register Fingerprint ── */}
              <TabsContent value="register">
                <div className="max-w-2xl mx-auto space-y-4">
                  {!biometricSupported && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                      <strong>Note:</strong> Biometric WebAuthn is not supported
                      on this device. Registration cannot be completed here.
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employee..."
                      value={regSearch}
                      onChange={(e) => setRegSearch(e.target.value)}
                      className="pl-9"
                      data-ocid="biometric.search_input"
                    />
                  </div>

                  <div className="space-y-2">
                    {regSearchResults.length === 0 ? (
                      <div
                        className="text-center py-10 text-muted-foreground"
                        data-ocid="biometric.empty_state"
                      >
                        No employees found
                      </div>
                    ) : (
                      regSearchResults.map((emp: any, i: number) => {
                        const isRegistered = registeredEmpIds.has(
                          emp.id.toString(),
                        );
                        const isRegistering =
                          registeringId === emp.id.toString();
                        const isRemoving = removingId === emp.id.toString();
                        return (
                          <motion.div
                            key={emp.id.toString()}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm"
                            data-ocid={`biometric.item.${i + 1}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                                {emp.name[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-sm">
                                  {emp.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {emp.customId || emp.id.toString()} ·{" "}
                                  {shiftToStr(emp.shiftType)} shift
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRegistered ? (
                                <>
                                  <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                    <CheckCircle className="w-3 h-3" />{" "}
                                    Registered
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                    disabled={isRemoving}
                                    onClick={() => handleRemoveFingerprint(emp)}
                                    data-ocid={`biometric.delete_button.${i + 1}`}
                                  >
                                    {isRemoving ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  className="gatekeeper-gradient text-white hover:opacity-90"
                                  disabled={
                                    isRegistering || !biometricSupported
                                  }
                                  onClick={() => handleRegisterFingerprint(emp)}
                                  data-ocid={`biometric.primary_button.${i + 1}`}
                                >
                                  {isRegistering ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                      Registering...
                                    </>
                                  ) : (
                                    <>
                                      <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
                                      Register
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ══════════════════ MANUAL TAB ══════════════════ */}
          <TabsContent value="manual">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle>Search Employee</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Employee ID or name..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      className="pl-9"
                      data-ocid="manual.search_input"
                    />
                  </div>
                  {manualSearchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                      {manualSearchResults.map((emp: any) => (
                        <button
                          type="button"
                          key={emp.id.toString()}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setManualSearch("");
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                            selectedEmp?.id.toString() === emp.id.toString()
                              ? "bg-orange-50"
                              : ""
                          }`}
                        >
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {emp.customId || emp.id.toString()} ·{" "}
                            {shiftToStr(emp.shiftType)} shift
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedEmp && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="font-semibold">{selectedEmp.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {selectedEmp.customId || selectedEmp.id.toString()}{" "}
                        · {shiftToStr(selectedEmp.shiftType)} shift
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEmp(null)}
                        className="text-xs text-red-500 mt-1"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle>Mark Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={attendanceType}
                      onValueChange={(v) =>
                        setAttendanceType(v as "in" | "out")
                      }
                    >
                      <SelectTrigger data-ocid="manual.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Check In</SelectItem>
                        <SelectItem value="out">Check Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={
                        attendanceType === "in" ? checkInTime : checkOutTime
                      }
                      onChange={(e) =>
                        attendanceType === "in"
                          ? setCheckInTime(e.target.value)
                          : setCheckOutTime(e.target.value)
                      }
                      data-ocid="manual.input"
                    />
                  </div>
                  <Button
                    className="w-full gatekeeper-gradient text-white hover:opacity-90"
                    onClick={handleMarkAttendance}
                    disabled={!selectedEmp || loadingData}
                    data-ocid="manual.submit_button"
                  >
                    Mark {attendanceType === "in" ? "Check In" : "Check Out"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════ APPROVALS TAB ══════════════════ */}
          <TabsContent value="approvals">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Pending Self Check-Ins</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingApprovals.length === 0 ? (
                  <div
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="approvals.empty_state"
                  >
                    No pending approvals
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map((a: any, i: number) => (
                        <TableRow
                          key={a.id.toString()}
                          data-ocid={`approvals.item.${i + 1}`}
                        >
                          <TableCell className="font-medium">
                            {a.employeeId.toString()}
                          </TableCell>
                          <TableCell>{a.date}</TableCell>
                          <TableCell>
                            {a.checkIn?.[0]
                              ? nsToFullTimeStr(a.checkIn[0])
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {a.checkOut?.[0]
                              ? nsToFullTimeStr(a.checkOut[0])
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(a, true)}
                                data-ocid={`approvals.confirm_button.${i + 1}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-300"
                                onClick={() => handleApprove(a, false)}
                                data-ocid={`approvals.cancel_button.${i + 1}`}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════ TODAY'S LIST TAB ══════════════════ */}
          <TabsContent value="today">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Today's Attendance — {today}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {todayAttendance.length === 0 ? (
                  <div
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="today.empty_state"
                  >
                    No attendance recorded today
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayAttendance.map((a: any, i: number) => (
                        <TableRow
                          key={a.id.toString()}
                          data-ocid={`today.item.${i + 1}`}
                        >
                          <TableCell className="font-medium">
                            {a.employeeId.toString()}
                          </TableCell>
                          <TableCell>
                            {a.checkIn?.[0]
                              ? nsToFullTimeStr(a.checkIn[0])
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {a.checkOut?.[0]
                              ? nsToFullTimeStr(a.checkOut[0])
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {a.netHours ? `${a.netHours.toFixed(1)}h` : "-"}
                          </TableCell>
                          <TableCell>
                            {statusBadge(statusToStr(a.status))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── ManualEntryForm (reusable inline fallback) ──────────────────────────────
function ManualEntryForm({
  employees,
  todayAttendance,
  today,
  onSuccess,
  actor,
  auth,
}: {
  employees: any[];
  todayAttendance: any[];
  today: string;
  onSuccess: () => Promise<void>;
  actor: any;
  auth: any;
}) {
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [type, setType] = useState<"in" | "out">("in");
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [time, setTime] = useState(defaultTime);

  const searchResults =
    search.length >= 1
      ? employees.filter(
          (e: any) =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.customId?.toLowerCase().includes(search.toLowerCase()),
        )
      : employees;

  const buildTimestamp = (t: string): bigint =>
    BigInt(new Date(`${today}T${t}:00`).getTime()) * 1_000_000n;

  const handleSubmit = async () => {
    if (!actor || !auth || !selectedEmp) {
      toast.error("Select an employee");
      return;
    }
    try {
      if (type === "in") {
        const ts = buildTimestamp(time);
        const result = await actor.markAttendance(
          auth.token,
          selectedEmp.id,
          today,
          ts,
          false,
        );
        if (result[0] != null) {
          toast.success(`Check-in recorded for ${selectedEmp.name}`);
          setSelectedEmp(null);
          setSearch("");
          await onSuccess();
        } else {
          toast.error("Already checked in or error occurred");
        }
      } else {
        const openRecord = todayAttendance.find(
          (a: any) =>
            a.employeeId.toString() === selectedEmp.id.toString() &&
            a.checkIn?.[0] != null &&
            a.checkOut?.[0] == null,
        );
        if (!openRecord) {
          toast.error("No open check-in found");
          return;
        }
        const ts = buildTimestamp(time);
        const ok = await actor.checkOut(auth.token, openRecord.id, ts);
        if (ok) {
          toast.success(`Check-out recorded for ${selectedEmp.name}`);
          setSelectedEmp(null);
          setSearch("");
          await onSuccess();
        } else {
          toast.error("Error recording check-out");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    }
  };

  return (
    <div className="p-4 space-y-4 bg-white">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Employee ID ya naam se search karein..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="manual.fallback.search_input"
        />
      </div>
      {search.length >= 1 && searchResults.length > 0 && (
        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
          {searchResults.map((emp: any) => (
            <button
              type="button"
              key={emp.id.toString()}
              onClick={() => {
                setSelectedEmp(emp);
                setSearch("");
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 text-sm"
            >
              <span className="font-medium">{emp.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {emp.customId || emp.id.toString()}
              </span>
            </button>
          ))}
        </div>
      )}
      {selectedEmp && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm flex justify-between items-center">
          <div>
            <div className="font-semibold">{selectedEmp.name}</div>
            <div className="text-xs text-muted-foreground">
              ID: {selectedEmp.customId || selectedEmp.id.toString()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedEmp(null)}
            className="text-xs text-red-500"
          >
            Clear
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "in" | "out")}
          >
            <SelectTrigger className="h-9" data-ocid="manual.fallback.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Check In</SelectItem>
              <SelectItem value="out">Check Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9"
            data-ocid="manual.fallback.input"
          />
        </div>
      </div>
      <Button
        className="w-full gatekeeper-gradient text-white hover:opacity-90"
        onClick={handleSubmit}
        disabled={!selectedEmp}
        data-ocid="manual.fallback.submit_button"
      >
        Mark {type === "in" ? "Check In" : "Check Out"}
      </Button>
    </div>
  );
}
