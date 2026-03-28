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
  LogOut,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

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

export default function GatekeeperPortal() {
  const { auth, logout } = useAuth();
  const { actor, isFetching } = useActor();
  const [employees, setEmployees] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const today = new Date().toISOString().split("T")[0];

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
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on actor
  useEffect(() => {
    if (actor && !isFetching) {
      reload();
      setBiometricSupported(!!window.PublicKeyCredential);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setCheckInTime(timeStr);
      setCheckOutTime(timeStr);
    }
  }, [actor, isFetching]);

  const searchResults =
    search.length >= 1
      ? employees.filter(
          (e: any) =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.customId?.toLowerCase().includes(search.toLowerCase()),
        )
      : employees;

  const buildTimestamp = (date: string, time: string): bigint => {
    return BigInt(new Date(`${date}T${time}:00`).getTime()) * 1_000_000n;
  };

  const handleMarkAttendance = async () => {
    if (!actor || !auth) return;
    if (!selectedEmp) {
      toast.error("Select an employee");
      return;
    }

    try {
      if (type === "in") {
        const checkInTs = buildTimestamp(today, checkInTime);
        const result = await actor.markAttendance(
          auth.token,
          selectedEmp.id,
          today,
          checkInTs,
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
        const checkOutTs = buildTimestamp(today, checkOutTime);
        const ok = await actor.checkOut(auth.token, openRecord.id, checkOutTs);
        if (ok) {
          toast.success(`Check-out recorded for ${selectedEmp.name}`);
        } else {
          toast.error("Error recording check-out");
        }
      }
      setSelectedEmp(null);
      setSearch("");
      await reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    }
  };

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

  const handleBiometric = async () => {
    if (!actor || !auth) return;
    if (!selectedEmp) {
      toast.error("Select an employee first");
      return;
    }
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        },
      });
      if (credential) {
        const checkInTs = BigInt(Date.now()) * 1_000_000n;
        const result = await actor.markAttendance(
          auth.token,
          selectedEmp.id,
          today,
          checkInTs,
          false,
        );
        if (result[0] != null) {
          toast.success(`Biometric check-in for ${selectedEmp.name}`);
          setSelectedEmp(null);
          setSearch("");
          await reload();
        } else {
          toast.error("Already checked in or error occurred");
        }
      }
    } catch {
      toast.error("Biometric verification failed or cancelled");
    }
  };

  if (isFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="manual">
          <TabsList className="mb-6" data-ocid="gatekeeper.tab">
            <TabsTrigger value="manual">Manual Attendance</TabsTrigger>
            <TabsTrigger value="biometric">Biometric</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="today">Today's List</TabsTrigger>
          </TabsList>

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
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                      data-ocid="gatekeeper.search_input"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                      {searchResults.map((emp: any) => (
                        <button
                          type="button"
                          key={emp.id.toString()}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setSearch("");
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
                      value={type}
                      onValueChange={(v) => setType(v as "in" | "out")}
                    >
                      <SelectTrigger data-ocid="gatekeeper.select">
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
                      value={type === "in" ? checkInTime : checkOutTime}
                      onChange={(e) =>
                        type === "in"
                          ? setCheckInTime(e.target.value)
                          : setCheckOutTime(e.target.value)
                      }
                      data-ocid="gatekeeper.input"
                    />
                  </div>
                  <Button
                    className="w-full gatekeeper-gradient text-white hover:opacity-90"
                    onClick={handleMarkAttendance}
                    disabled={!selectedEmp || loadingData}
                    data-ocid="gatekeeper.submit_button"
                  >
                    Mark {type === "in" ? "Check In" : "Check Out"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="biometric">
            <Card className="border-0 shadow-card max-w-md mx-auto">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-full gatekeeper-gradient flex items-center justify-center mx-auto">
                  <Fingerprint className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Biometric Attendance
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {biometricSupported
                      ? "WebAuthn/fingerprint is available on this device. Select an employee and tap verify."
                      : "Biometric (WebAuthn) is not supported on this browser/device. Use manual attendance instead."}
                  </p>
                </div>
                {biometricSupported && (
                  <>
                    <div className="relative text-left">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by Employee ID or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y text-left max-h-52 overflow-y-auto">
                        {searchResults.map((emp: any) => (
                          <button
                            type="button"
                            key={emp.id.toString()}
                            onClick={() => {
                              setSelectedEmp(emp);
                              setSearch("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-muted/50"
                          >
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {emp.customId || emp.id.toString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedEmp && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-left">
                        <div className="font-medium">{selectedEmp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID:{" "}
                          {selectedEmp.customId || selectedEmp.id.toString()}
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full gatekeeper-gradient text-white hover:opacity-90"
                      onClick={handleBiometric}
                      disabled={!selectedEmp}
                      data-ocid="gatekeeper.biometric_button"
                    >
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Verify Fingerprint
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
