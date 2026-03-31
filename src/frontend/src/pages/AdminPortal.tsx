import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { getRecoveryCode } from "../utils/storage";

// ---- helpers ----
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

function stringToShift(s: string): any {
  if (s === "night") return { night: null };
  if (s === "both") return { both: null };
  return { day: null };
}

function nsToTimeStr(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleTimeString();
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

function shiftBadge(shift: string) {
  const map: Record<string, string> = {
    day: "bg-blue-100 text-blue-700",
    night: "bg-purple-100 text-purple-700",
    both: "bg-orange-100 text-orange-700",
  };
  return (
    <Badge className={map[shift] || ""}>
      {shift.charAt(0).toUpperCase() + shift.slice(1)}
    </Badge>
  );
}
// ---- end helpers ----

export default function AdminPortal() {
  const { auth, logout } = useAuth();
  const { actor, isFetching } = useActor();

  const [tab, setTab] = useState("dashboard");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<any | null>(null);
  const [addRosterOpen, setAddRosterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Show credentials
  const [showCredsEmp, setShowCredsEmp] = useState<any | null>(null);
  // Admin change password
  const [adminOldPass, setAdminOldPass] = useState("");
  const [adminNewPass, setAdminNewPass] = useState("");
  const [adminConfirmPass, setAdminConfirmPass] = useState("");
  // Gatekeeper credentials
  const [gatekeeperEmp, setGatekeeperEmp] = useState<any | null>(null);
  const [gkUsername, setGkUsername] = useState("");
  const [gkPassword, setGkPassword] = useState("");
  // Recovery code
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);

  // New employee form
  const [empForm, setEmpForm] = useState({
    customId: "",
    name: "",
    username: "",
    password: "",
    role: "employee",
    hourlyRate: 150,
    shiftType: "day",
  });

  // Roster form
  const [rosterForm, setRosterForm] = useState({
    employeeId: "",
    shiftType: "day",
    date: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const loadDashboard = async () => {
    if (!actor || !auth) return;
    // Load employees and pending separately so one failure doesn't block the other
    try {
      const emps = await actor.getAllEmployees(auth.token);
      setEmployees(emps);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
    try {
      const pending = await actor.getPendingAttendance(auth.token);
      setPendingList(pending);
    } catch (err) {
      console.error("Failed to load pending attendance:", err);
    }
  };

  const loadAttendance = async () => {
    if (!actor || !auth) return;
    const records = await actor.getAttendanceByMonth(
      auth.token,
      attendanceMonth,
    );
    setAttendance(records);
  };

  const loadReports = async () => {
    if (!actor || !auth) return;
    const [salary, roster] = await Promise.all([
      actor.getSalaryReport(auth.token, reportMonth),
      actor.getRosterByMonth(auth.token, reportMonth),
    ]);
    setSalaryData(salary);
    setRosterEntries(roster);
  };

  const loadRoster = async () => {
    if (!actor || !auth) return;
    const roster = await actor.getRosterByMonth(auth.token, reportMonth);
    setRosterEntries(roster);
  };

  const reload = async () => {
    if (!actor || !auth) return;
    setLoadingData(true);
    // Run independently so one failure doesn't block the other
    await Promise.allSettled([loadDashboard(), loadAttendance()]);
    setLoadingData(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on actor
  useEffect(() => {
    if (actor && !isFetching) reload();
  }, [actor, isFetching]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on month change
  useEffect(() => {
    if (actor && !isFetching) loadAttendance();
  }, [attendanceMonth]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on report month
  useEffect(() => {
    if (actor && !isFetching) {
      loadReports();
    }
  }, [reportMonth, actor]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: load gatekeeper on settings tab
  useEffect(() => {
    if (tab === "settings" && actor && auth) {
      actor.getAllEmployees(auth.token).then((emps: any[]) => {
        const gk = emps.find((e: any) => e.role && "gatekeeper" in e.role);
        if (gk) {
          setGatekeeperEmp(gk);
          setGkUsername(gk.username);
        }
      });
    }
  }, [tab]);

  const today_present = attendance.filter(
    (a: any) => a.date === today && statusToStr(a.status) === "approved",
  ).length;

  const activeEmps = employees.filter(
    (e: any) =>
      e.isActive &&
      !(e.role && "admin" in e.role) &&
      !(e.role && "gatekeeper" in e.role),
  );

  const thisMonthHours = attendance
    .filter((a: any) => statusToStr(a.status) === "approved")
    .reduce((s: number, a: any) => s + (a.netHours || 0), 0);

  const handleAddEmployee = async () => {
    if (!actor || !auth) return;
    if (
      !empForm.customId ||
      !empForm.name ||
      !empForm.username ||
      !empForm.password
    ) {
      toast.error("Please fill all required fields including Employee ID");
      return;
    }
    try {
      const roleVariant =
        empForm.role === "admin"
          ? { admin: null }
          : empForm.role === "gatekeeper"
            ? { gatekeeper: null }
            : { employee: null };
      const result = await (actor as any).addEmployee(
        auth.token,
        empForm.customId,
        empForm.name,
        empForm.username,
        empForm.password,
        roleVariant,
        empForm.hourlyRate,
        stringToShift(empForm.shiftType),
      );
      if (result[0] != null) {
        toast.success("Employee added!");
        setAddEmpOpen(false);
        setEmpForm({
          customId: "",
          name: "",
          username: "",
          password: "",
          role: "employee",
          hourlyRate: 150,
          shiftType: "day",
        });
        await loadDashboard();
      } else {
        toast.error("Failed to add employee (username may already exist)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!actor || !auth || !editEmp) return;
    try {
      const ok = await actor.updateEmployee(
        auth.token,
        editEmp.id,
        editEmp.name,
        editEmp.hourlyRate,
        stringToShift(shiftToStr(editEmp.shiftType)),
      );
      if (ok) {
        toast.success("Employee updated!");
        setEditEmp(null);
        await loadDashboard();
      } else {
        toast.error("Failed to update employee");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating employee");
    }
  };

  const handleDeactivate = async (emp: any) => {
    if (!actor || !auth) return;
    try {
      const ok = await actor.deleteEmployee(auth.token, emp.id);
      if (ok) {
        toast.success(`${emp.name} deactivated`);
        await loadDashboard();
      } else {
        toast.error("Failed to deactivate");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deactivating employee");
    }
  };

  const handleApprove = async (record: any, approved: boolean) => {
    if (!actor || !auth) return;
    try {
      const ok = await actor.approveAttendance(auth.token, record.id, approved);
      if (ok) {
        toast.success(approved ? "Approved!" : "Rejected");
        await Promise.all([loadDashboard(), loadAttendance()]);
      } else {
        toast.error("Failed to update");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRoster = async () => {
    if (!actor || !auth) return;
    if (!rosterForm.employeeId || !rosterForm.date) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      const ok = await actor.setRoster(
        auth.token,
        BigInt(rosterForm.employeeId),
        rosterForm.date,
        stringToShift(rosterForm.shiftType),
      );
      if (ok) {
        toast.success("Roster entry created!");
        setAddRosterOpen(false);
        setRosterForm({ employeeId: "", shiftType: "day", date: "" });
        await loadRoster();
      } else {
        toast.error("Failed to create roster entry");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating roster");
    }
  };

  const handleAdminChangePassword = async () => {
    if (!actor || !auth) return;
    if (!adminNewPass || !adminOldPass) {
      toast.error("Fill all fields");
      return;
    }
    if (adminNewPass !== adminConfirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const ok = await actor.changePassword(
        auth.token,
        adminOldPass,
        adminNewPass,
      );
      if (ok) {
        toast.success("Admin password changed!");
        setAdminOldPass("");
        setAdminNewPass("");
        setAdminConfirmPass("");
      } else {
        toast.error("Current password is incorrect");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error changing password");
    }
  };

  const handleGatekeeperUpdate = async () => {
    if (!actor || !auth || !gatekeeperEmp) {
      toast.error("Gatekeeper not found");
      return;
    }
    if (!gkUsername) {
      toast.error("Username cannot be empty");
      return;
    }
    try {
      // Change password by logging in as gatekeeper with their current password
      if (gkPassword) {
        const currentGkPass = gatekeeperEmp.passwordHash;
        const gkLoginResult = await actor.login(gkUsername, currentGkPass);
        const gkToken = gkLoginResult[0]?.token;
        if (gkToken) {
          const pwOk = await actor.changePassword(
            gkToken,
            currentGkPass,
            gkPassword,
          );
          if (!pwOk) {
            toast.error("Failed to change gatekeeper password");
            return;
          }
        } else {
          toast.error("Could not authenticate as gatekeeper");
          return;
        }
      }
      // Update name if username changed (updateEmployee doesn't change username)
      // Username change not supported directly — show note
      if (gkUsername !== gatekeeperEmp.username) {
        toast.info(
          "Note: Username change is not supported via backend. Only password was updated.",
        );
      } else {
        toast.success("Gatekeeper credentials updated!");
      }
      setGkPassword("");
      // Refresh gatekeeper data
      const emps = await actor.getAllEmployees(auth.token);
      const gk = emps.find((e: any) => e.role && "gatekeeper" in e.role);
      if (gk) {
        setGatekeeperEmp(gk);
        setGkUsername(gk.username);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating gatekeeper credentials");
    }
  };

  const filteredAttendance = filterDate
    ? attendance.filter((a: any) => a.date === filterDate)
    : [...attendance].reverse().slice(0, 50);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "employees", label: "Employees", icon: Users },
    { key: "rosters", label: "Shifts & Rosters", icon: Calendar },
    { key: "attendance", label: "Attendance", icon: Clock },
    { key: "reports", label: "Reports", icon: Shield },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const headerTitle = () => {
    const found = navItems.find((n) => n.key === tab);
    return found ? found.label : "Dashboard";
  };

  if (isFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground flex-shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl admin-gradient flex items-center justify-center text-white font-black text-lg">
              A
            </div>
            <div>
              <div className="font-bold text-sm">Attendify</div>
              <div className="text-xs text-sidebar-foreground/60">
                Admin Panel
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
              data-ocid={`admin.${key}.tab`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 mb-2">
            {auth?.name}
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors"
            data-ocid="admin.logout_button"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex">
        {navItems.map(({ key, icon: Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs ${
              tab === key ? "text-blue-600" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="capitalize text-[10px]">{key}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold capitalize">{headerTitle()}</h1>
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{auth?.name}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              data-ocid="admin.logout_button"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          {loadingData && (
            <Loader2 className="hidden md:block w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </header>

        <div className="p-6">
          {/* Dashboard */}
          {tab === "dashboard" && (
            <div className="space-y-6" data-ocid="dashboard.section">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Employees",
                    value: activeEmps.length,
                    color: "#2E7BFF",
                    icon: Users,
                  },
                  {
                    label: "Present Today",
                    value: today_present,
                    color: "#31D07F",
                    icon: CheckCircle,
                  },
                  {
                    label: "Pending Approvals",
                    value: pendingList.length,
                    color: "#FF7A18",
                    icon: Clock,
                  },
                  {
                    label: "This Month Hours",
                    value: `${thisMonthHours.toFixed(1)}h`,
                    color: "#7C3AED",
                    icon: BarChart3,
                  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <Card key={label} className="border-0 shadow-card">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                          {label}
                        </span>
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold">{value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pending approvals */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">
                    Pending Approvals ({pendingList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingList.length === 0 ? (
                    <div
                      className="text-center py-8 text-muted-foreground"
                      data-ocid="attendance.empty_state"
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
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingList.slice(0, 10).map((a: any, i: number) => (
                          <TableRow
                            key={a.id.toString()}
                            data-ocid={`attendance.item.${i + 1}`}
                          >
                            <TableCell className="font-medium">
                              {a.employeeId.toString()}
                            </TableCell>
                            <TableCell>{a.date}</TableCell>
                            <TableCell>
                              {a.checkIn?.[0] ? nsToTimeStr(a.checkIn[0]) : "-"}
                            </TableCell>
                            <TableCell>
                              {statusBadge(statusToStr(a.status))}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                  onClick={() => handleApprove(a, true)}
                                  data-ocid={`attendance.confirm_button.${i + 1}`}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-300 h-7 px-2"
                                  onClick={() => handleApprove(a, false)}
                                  data-ocid={`attendance.cancel_button.${i + 1}`}
                                >
                                  <XCircle className="w-3 h-3" />
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
            </div>
          )}

          {/* Employees */}
          {tab === "employees" && (
            <div className="space-y-4" data-ocid="employees.section">
              <div className="flex justify-end">
                <Button
                  onClick={() => setAddEmpOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-ocid="employees.primary_button"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Employee
                </Button>
              </div>
              <Card className="border-0 shadow-card">
                <CardContent className="p-0">
                  {employees.length === 0 ? (
                    <div
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="employees.empty_state"
                    >
                      No employees found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Rate/hr</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp: any, i: number) => (
                          <TableRow
                            key={emp.id.toString()}
                            data-ocid={`employees.item.${i + 1}`}
                          >
                            <TableCell className="font-mono text-xs">
                              {emp.customId || emp.id.toString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {emp.name}
                            </TableCell>
                            <TableCell>{emp.username}</TableCell>
                            <TableCell>
                              {shiftBadge(shiftToStr(emp.shiftType))}
                            </TableCell>
                            <TableCell>₹{emp.hourlyRate}/hr</TableCell>
                            <TableCell>
                              {emp.isActive ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-red-500 border-red-300"
                                >
                                  Deactivated
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 border-purple-300"
                                  onClick={() => setShowCredsEmp({ ...emp })}
                                  data-ocid={`employees.secondary_button.${i + 1}`}
                                >
                                  <Eye className="w-3 h-3 mr-1" /> Credentials
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditEmp({
                                      ...emp,
                                      shiftTypeStr: shiftToStr(emp.shiftType),
                                    })
                                  }
                                  data-ocid={`employees.edit_button.${i + 1}`}
                                >
                                  Edit
                                </Button>
                                {emp.isActive && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-300"
                                    onClick={() => handleDeactivate(emp)}
                                    data-ocid={`employees.delete_button.${i + 1}`}
                                  >
                                    Deactivate
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rosters */}
          {tab === "rosters" && (
            <div className="space-y-4" data-ocid="rosters.section">
              <div className="flex items-center gap-3">
                <div>
                  <Label>Roster Month</Label>
                  <Input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="mt-1 w-44"
                  />
                </div>
                <div className="flex-1" />
                <Button
                  onClick={() => setAddRosterOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white self-end"
                  data-ocid="rosters.primary_button"
                >
                  <Plus className="w-4 h-4 mr-2" /> Set Roster
                </Button>
              </div>
              <Card className="border-0 shadow-card">
                <CardContent className="p-0">
                  {rosterEntries.length === 0 ? (
                    <div
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="rosters.empty_state"
                    >
                      No roster entries for this month.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Shift</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rosterEntries.map((r: any, i: number) => (
                          <TableRow
                            key={`${r.employeeId}-${r.date}`}
                            data-ocid={`rosters.item.${i + 1}`}
                          >
                            <TableCell>{r.employeeId.toString()}</TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>
                              {shiftBadge(shiftToStr(r.shiftType))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance */}
          {tab === "attendance" && (
            <div className="space-y-4" data-ocid="attendance_tab.section">
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                    className="mt-1 w-44"
                  />
                </div>
                <div className="flex-1">
                  <Label>Filter by Date</Label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="mt-1"
                    data-ocid="attendance.input"
                  />
                </div>
                {filterDate && (
                  <Button
                    variant="outline"
                    onClick={() => setFilterDate("")}
                    className="self-end"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Card className="border-0 shadow-card">
                <CardContent className="p-0">
                  {filteredAttendance.length === 0 ? (
                    <div
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="attendance_tab.empty_state"
                    >
                      No records found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendance.map((a: any, i: number) => (
                          <TableRow
                            key={a.id.toString()}
                            data-ocid={`attendance_tab.item.${i + 1}`}
                          >
                            <TableCell className="font-medium">
                              {a.employeeId.toString()}
                            </TableCell>
                            <TableCell>{a.date}</TableCell>
                            <TableCell>
                              {a.checkIn?.[0] ? nsToTimeStr(a.checkIn[0]) : "-"}
                            </TableCell>
                            <TableCell>
                              {a.checkOut?.[0]
                                ? nsToTimeStr(a.checkOut[0])
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {a.netHours ? `${a.netHours.toFixed(1)}h` : "-"}
                            </TableCell>
                            <TableCell>
                              {statusBadge(statusToStr(a.status))}
                            </TableCell>
                            <TableCell>
                              {statusToStr(a.status) === "pending" && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                    onClick={() => handleApprove(a, true)}
                                    data-ocid={`attendance_tab.confirm_button.${i + 1}`}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-300 h-7 px-2"
                                    onClick={() => handleApprove(a, false)}
                                    data-ocid={`attendance_tab.cancel_button.${i + 1}`}
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports */}
          {tab === "reports" && (
            <div className="space-y-4" data-ocid="reports.section">
              <div className="flex gap-3 items-end">
                <div>
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="mt-1 w-44"
                    data-ocid="reports.input"
                  />
                </div>
              </div>
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle>Salary Report — {reportMonth}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {salaryData.length === 0 ? (
                    <div
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="reports.empty_state"
                    >
                      No data for this month
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Rate/hr</TableHead>
                          <TableHead>Total Salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryData.map((row: any, i: number) => (
                          <TableRow
                            key={row.employeeId.toString()}
                            data-ocid={`reports.item.${i + 1}`}
                          >
                            <TableCell className="font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {row.employeeId.toString()}
                            </TableCell>
                            <TableCell>{row.totalHours.toFixed(1)}h</TableCell>
                            <TableCell>₹{row.hourlyRate}</TableCell>
                            <TableCell className="font-bold text-green-700">
                              ₹{row.totalSalary.toFixed(0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          {tab === "settings" && (
            <div className="space-y-6 max-w-2xl" data-ocid="settings.section">
              {/* Admin Change Password */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> Change Admin Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={adminOldPass}
                      onChange={(e) => setAdminOldPass(e.target.value)}
                      placeholder="••••••"
                      data-ocid="settings.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={adminNewPass}
                      onChange={(e) => setAdminNewPass(e.target.value)}
                      placeholder="••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={adminConfirmPass}
                      onChange={(e) => setAdminConfirmPass(e.target.value)}
                      placeholder="••••••"
                    />
                  </div>
                  <Button
                    onClick={handleAdminChangePassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-ocid="settings.primary_button"
                  >
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              {/* Gatekeeper Credentials */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Gatekeeper Login Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gatekeeperEmp ? (
                    <>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                        <div>
                          <span className="text-muted-foreground">
                            Current username:{" "}
                          </span>
                          <code className="font-mono font-bold">
                            {gatekeeperEmp.username}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Current password:{" "}
                          </span>
                          <code className="font-mono font-bold">
                            {gatekeeperEmp.passwordHash}
                          </code>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          New Password (leave blank to keep current)
                        </Label>
                        <Input
                          type="password"
                          value={gkPassword}
                          onChange={(e) => setGkPassword(e.target.value)}
                          placeholder="New password..."
                        />
                      </div>
                      <Button
                        onClick={handleGatekeeperUpdate}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        data-ocid="settings.secondary_button"
                        disabled={!gkPassword}
                      >
                        Update Gatekeeper Password
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No gatekeeper found.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Recovery Code */}
              <Card className="border-0 shadow-card border-amber-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <Shield className="w-4 h-4" /> Emergency Recovery Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This code can be used to reset admin password if you forget
                    it. Keep it safe and secret.
                  </p>
                  {showRecoveryCode ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <code className="text-2xl font-mono font-bold text-amber-800 tracking-widest">
                        {getRecoveryCode()}
                      </code>
                      <p className="text-xs text-amber-600 mt-2">
                        Write this down somewhere safe!
                      </p>
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowRecoveryCode((v) => !v)}
                    data-ocid="settings.toggle"
                  >
                    {showRecoveryCode ? (
                      <EyeOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    {showRecoveryCode ? "Hide" : "Show"} Recovery Code
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Show Credentials Dialog */}
      {showCredsEmp && (
        <Dialog
          open={!!showCredsEmp}
          onOpenChange={() => setShowCredsEmp(null)}
        >
          <DialogContent
            className="sm:max-w-sm"
            data-ocid="show_credentials.dialog"
          >
            <DialogHeader>
              <DialogTitle>Credentials — {showCredsEmp.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted/60 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Backend ID
                  </p>
                  <code className="font-mono font-bold text-sm">
                    {showCredsEmp.id.toString()}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  <code className="font-mono font-bold text-sm">
                    {showCredsEmp.username}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Password</p>
                  <code className="font-mono font-bold text-sm">
                    {showCredsEmp.passwordHash}
                  </code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                If this employee changed their password, the latest password is
                shown above.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowCredsEmp(null)}
                data-ocid="show_credentials.close_button"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="sm:max-w-lg" data-ocid="add_employee.dialog">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee ID *</Label>
              <Input
                value={empForm.customId}
                onChange={(e) =>
                  setEmpForm((p) => ({ ...p, customId: e.target.value }))
                }
                placeholder="e.g. EMP001 or 101"
                data-ocid="add_employee.id_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={empForm.name}
                onChange={(e) =>
                  setEmpForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="John Doe"
                data-ocid="add_employee.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={empForm.username}
                onChange={(e) =>
                  setEmpForm((p) => ({ ...p, username: e.target.value }))
                }
                placeholder="john.doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                value={empForm.password}
                onChange={(e) =>
                  setEmpForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={empForm.role}
                onValueChange={(v) => setEmpForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger data-ocid="add_employee.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift Type</Label>
              <Select
                value={empForm.shiftType}
                onValueChange={(v) =>
                  setEmpForm((p) => ({ ...p, shiftType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day (7am–7pm)</SelectItem>
                  <SelectItem value="night">Night (7pm–7am)</SelectItem>
                  <SelectItem value="both">Both / Rotational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hourly Rate (₹)</Label>
              <Input
                type="number"
                value={empForm.hourlyRate}
                onChange={(e) =>
                  setEmpForm((p) => ({
                    ...p,
                    hourlyRate: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddEmpOpen(false)}
              data-ocid="add_employee.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEmployee}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-ocid="add_employee.submit_button"
            >
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      {editEmp && (
        <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
          <DialogContent
            className="sm:max-w-md"
            data-ocid="edit_employee.dialog"
          >
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editEmp.name}
                  onChange={(e) =>
                    setEditEmp((p: any) =>
                      p ? { ...p, name: e.target.value } : p,
                    )
                  }
                  data-ocid="edit_employee.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shift Type</Label>
                <Select
                  value={editEmp.shiftTypeStr || shiftToStr(editEmp.shiftType)}
                  onValueChange={(v) =>
                    setEditEmp((p: any) => (p ? { ...p, shiftTypeStr: v } : p))
                  }
                >
                  <SelectTrigger data-ocid="edit_employee.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day (7am–7pm)</SelectItem>
                    <SelectItem value="night">Night (7pm–7am)</SelectItem>
                    <SelectItem value="both">Both / Rotational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hourly Rate (₹)</Label>
                <Input
                  type="number"
                  value={editEmp.hourlyRate}
                  onChange={(e) =>
                    setEditEmp((p: any) =>
                      p ? { ...p, hourlyRate: Number(e.target.value) } : p,
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditEmp(null)}
                data-ocid="edit_employee.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditEmployee}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-ocid="edit_employee.save_button"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Roster Dialog */}
      <Dialog open={addRosterOpen} onOpenChange={setAddRosterOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="add_roster.dialog">
          <DialogHeader>
            <DialogTitle>Set Roster Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select
                value={rosterForm.employeeId}
                onValueChange={(v) =>
                  setRosterForm((p) => ({ ...p, employeeId: v }))
                }
              >
                <SelectTrigger data-ocid="add_roster.select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmps.map((e: any) => (
                    <SelectItem key={e.id.toString()} value={e.id.toString()}>
                      {e.name} (ID: {e.id.toString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select
                value={rosterForm.shiftType}
                onValueChange={(v) =>
                  setRosterForm((p) => ({ ...p, shiftType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day (7am–7pm)</SelectItem>
                  <SelectItem value="night">Night (7pm–7am)</SelectItem>
                  <SelectItem value="both">Both / Rotational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={rosterForm.date}
                onChange={(e) =>
                  setRosterForm((p) => ({ ...p, date: e.target.value }))
                }
                data-ocid="add_roster.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddRosterOpen(false)}
              data-ocid="add_roster.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRoster}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-ocid="add_roster.submit_button"
            >
              Set Roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
