import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

function nsToTimeStr(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusToStr(status: any): string {
  if (status && "approved" in status) return "approved";
  if (status && "rejected" in status) return "rejected";
  return "pending";
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

export default function EmployeePortal() {
  const { auth, logout } = useAuth();
  const { actor, isFetching } = useActor();
  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [viewMonth, setViewMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const reload = async () => {
    if (!actor || !auth) return;
    setLoadingData(true);
    try {
      const [empResult, attResult] = await Promise.all([
        actor.lookupEmployee(auth.token, BigInt(auth.employeeId)),
        actor.getMyAttendance(auth.token, viewMonth),
      ]);
      if (empResult[0]) setEmployee(empResult[0]);
      setAttendance([...attResult].reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on actor/month
  useEffect(() => {
    if (actor && !isFetching) reload();
  }, [actor, isFetching, viewMonth]);

  const todayRecord = attendance.find((a) => a.date === today);
  const checkedIn = todayRecord?.checkIn?.[0] != null;
  const checkedOut = todayRecord?.checkOut?.[0] != null;

  const monthRecords =
    viewMonth === currentMonth
      ? attendance.filter((a) => statusToStr(a.status) === "approved")
      : attendance.filter((a) => statusToStr(a.status) === "approved");
  const totalHoursThisMonth = monthRecords.reduce(
    (s: number, a: any) => s + (a.netHours || 0),
    0,
  );

  const handleCheckIn = async () => {
    if (!actor || !auth) return;
    if (checkedIn) {
      toast.error("Already checked in today");
      return;
    }
    try {
      const checkInTs = BigInt(Date.now()) * 1_000_000n;
      const result = await actor.markAttendance(
        auth.token,
        BigInt(auth.employeeId),
        today,
        checkInTs,
        true,
      );
      if (result[0] != null) {
        toast.success("Check-in submitted! Awaiting approval.");
        await reload();
      } else {
        toast.error("Already checked in or an error occurred.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    if (!actor || !auth || !todayRecord) return;
    if (!checkedIn) {
      toast.error("You haven't checked in yet");
      return;
    }
    if (checkedOut) {
      toast.error("Already checked out");
      return;
    }
    try {
      const checkOutTs = BigInt(Date.now()) * 1_000_000n;
      const ok = await actor.checkOut(auth.token, todayRecord.id, checkOutTs);
      if (ok) {
        toast.success("Check-out submitted! Awaiting approval.");
        await reload();
      } else {
        toast.error("Error checking out");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to check out");
    }
  };

  const handleChangePassword = async () => {
    if (!actor || !auth) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      const ok = await actor.changePassword(
        auth.token,
        oldPassword,
        newPassword,
      );
      if (ok) {
        toast.success("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error("Current password is incorrect");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to change password");
    }
  };

  const shiftStr = shiftToStr(employee?.shiftType);
  const shiftIcon =
    shiftStr === "night" ? (
      <Moon className="w-4 h-4" />
    ) : (
      <Sun className="w-4 h-4" />
    );

  if (isFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl employee-gradient flex items-center justify-center text-white font-black">
            {(employee?.name || auth?.name || "E")[0]}
          </div>
          <div>
            <div className="font-bold">{employee?.name || auth?.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {shiftIcon} {shiftStr} shift · ID: {auth?.employeeId}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          data-ocid="employee.logout_button"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* Today's status */}
        <Card className="border-0 shadow-card mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Today — {today}</h2>
              {todayRecord ? (
                statusBadge(statusToStr(todayRecord.status))
              ) : (
                <Badge variant="outline">Not checked in</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <div className="text-xs text-muted-foreground mb-1">
                  Check In
                </div>
                <div className="font-bold text-green-700">
                  {todayRecord?.checkIn?.[0]
                    ? nsToTimeStr(todayRecord.checkIn[0])
                    : "--:--"}
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="text-xs text-muted-foreground mb-1">
                  Check Out
                </div>
                <div className="font-bold text-blue-700">
                  {todayRecord?.checkOut?.[0]
                    ? nsToTimeStr(todayRecord.checkOut[0])
                    : "--:--"}
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-xs text-muted-foreground mb-1">Hours</div>
                <div className="font-bold text-purple-700">
                  {todayRecord?.netHours
                    ? `${todayRecord.netHours.toFixed(1)}h`
                    : "--"}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full"
                disabled={checkedIn || loadingData}
                onClick={handleCheckIn}
                data-ocid="employee.checkin_button"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {checkedIn ? "Checked In" : "Check In"}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                disabled={!checkedIn || checkedOut || loadingData}
                onClick={handleCheckOut}
                data-ocid="employee.checkout_button"
              >
                <Clock className="w-4 h-4 mr-2" />
                {checkedOut ? "Checked Out" : "Check Out"}
              </Button>
            </div>
            {todayRecord && statusToStr(todayRecord.status) === "pending" && (
              <p
                className="text-xs text-yellow-600 text-center mt-3"
                data-ocid="employee.loading_state"
              >
                ⏳ Your attendance is pending approval from gatekeeper/admin
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {monthRecords.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Days This Month
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totalHoursThisMonth.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Hours This Month
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹
                {(totalHoursThisMonth * (employee?.hourlyRate || 0)).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Est. Salary
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="mb-4" data-ocid="employee.tab">
            <TabsTrigger value="history">Attendance History</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <div className="flex items-center gap-3 mb-3">
              <Label className="shrink-0">Month:</Label>
              <Input
                type="month"
                value={viewMonth}
                onChange={(e) => setViewMonth(e.target.value)}
                className="w-44"
              />
              {loadingData && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Card className="border-0 shadow-card">
              <CardContent className="p-0">
                {attendance.length === 0 ? (
                  <div
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="history.empty_state"
                  >
                    No attendance records yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 30).map((a: any, i: number) => (
                        <TableRow
                          key={a.id.toString()}
                          data-ocid={`history.item.${i + 1}`}
                        >
                          <TableCell>{a.date}</TableCell>
                          <TableCell>
                            {a.checkIn?.[0] ? nsToTimeStr(a.checkIn[0]) : "-"}
                          </TableCell>
                          <TableCell>
                            {a.checkOut?.[0] ? nsToTimeStr(a.checkOut[0]) : "-"}
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

          <TabsContent value="password">
            <Card className="border-0 shadow-card max-w-sm">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    data-ocid="password.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleChangePassword}
                  data-ocid="password.submit_button"
                >
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
