import Int64 "mo:core/Int64";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Time "mo:core/Time";

actor {
  public type Role = { #admin; #gatekeeper; #employee };
  public type ShiftType = { #day; #night; #both };
  public type AttendanceStatus = { #pending; #approved; #rejected };
  public type MarkedBy = { #gatekeeper; #admin; #self_ };

  public type Employee = {
    id : Nat;
    name : Text;
    username : Text;
    passwordHash : Text;
    role : Role;
    hourlyRate : Float;
    shiftType : ShiftType;
    isActive : Bool;
  };

  public type AttendanceRecord = {
    id : Nat;
    employeeId : Nat;
    date : Text;
    checkIn : ?Int;
    checkOut : ?Int;
    status : AttendanceStatus;
    markedBy : MarkedBy;
    netHours : Float;
  };

  public type EmployeeInfo = {
    id : Nat;
    customId : Text;
    name : Text;
    username : Text;
    passwordHash : Text;
    role : Role;
    hourlyRate : Float;
    shiftType : ShiftType;
    isActive : Bool;
  };

  public type AttendanceInfo = {
    id : Nat;
    employeeId : Nat;
    date : Text;
    checkIn : ?Int;
    checkOut : ?Int;
    status : AttendanceStatus;
    markedBy : MarkedBy;
    approvedBy : ?Text;
    netHours : Float;
  };

  public type RosterEntry = {
    employeeId : Nat;
    date : Text;
    shiftType : ShiftType;
  };

  public type Session = {
    employeeId : Nat;
    role : Role;
    expiresAt : Int;
  };

  public type SalaryReport = {
    employeeId : Nat;
    name : Text;
    totalHours : Float;
    hourlyRate : Float;
    totalSalary : Float;
  };

  public type LoginResult = {
    token : Text;
    role : Role;
    employeeId : Nat;
    name : Text;
  };

  // ─── Stable storage (survives canister upgrades) ───────────────────────────
  stable var stableNextEmployeeId : Nat = 1;
  stable var stableNextAttendanceId : Nat = 1;
  stable var stableInitialized : Bool = false;
  stable var stableEmployees : [(Nat, Employee)] = [];
  stable var stableAttendanceRecords : [(Nat, AttendanceRecord)] = [];
  stable var stableRosterEntries : [(Text, RosterEntry)] = [];
  stable var stableSessions : [(Text, Session)] = [];
  stable var stableEmployeeCustomIds : [(Nat, Text)] = [];
  stable var stableAttendanceApprovers : [(Nat, Text)] = [];

  // ─── In-memory maps (rebuilt from stable on upgrade) ───────────────────────
  var nextEmployeeId : Nat = stableNextEmployeeId;
  var nextAttendanceId : Nat = stableNextAttendanceId;
  var initialized : Bool = stableInitialized;
  var employees : Map.Map<Nat, Employee> = Map.empty();
  var attendanceRecords : Map.Map<Nat, AttendanceRecord> = Map.empty();
  var rosterEntries : Map.Map<Text, RosterEntry> = Map.empty();
  var sessions : Map.Map<Text, Session> = Map.empty();
  var employeeCustomIds : Map.Map<Nat, Text> = Map.empty();
  var attendanceApprovers : Map.Map<Nat, Text> = Map.empty();

  // Restore from stable storage on init
  do {
    for ((k, v) in stableEmployees.vals()) { employees.add(k, v) };
    for ((k, v) in stableAttendanceRecords.vals()) { attendanceRecords.add(k, v) };
    for ((k, v) in stableRosterEntries.vals()) { rosterEntries.add(k, v) };
    for ((k, v) in stableSessions.vals()) { sessions.add(k, v) };
    for ((k, v) in stableEmployeeCustomIds.vals()) { employeeCustomIds.add(k, v) };
    for ((k, v) in stableAttendanceApprovers.vals()) { attendanceApprovers.add(k, v) };
  };

  // Serialize to stable before upgrade
  system func preupgrade() {
    stableEmployees := employees.entries().toArray();
    stableAttendanceRecords := attendanceRecords.entries().toArray();
    stableRosterEntries := rosterEntries.entries().toArray();
    stableSessions := sessions.entries().toArray();
    stableEmployeeCustomIds := employeeCustomIds.entries().toArray();
    stableAttendanceApprovers := attendanceApprovers.entries().toArray();
    stableNextEmployeeId := nextEmployeeId;
    stableNextAttendanceId := nextAttendanceId;
    stableInitialized := initialized;
  };

  // Restore from stable after upgrade (in-memory vars are re-initialized above via do{})
  system func postupgrade() {
    nextEmployeeId := stableNextEmployeeId;
    nextAttendanceId := stableNextAttendanceId;
    initialized := stableInitialized;
    for ((k, v) in stableEmployees.vals()) { employees.add(k, v) };
    for ((k, v) in stableAttendanceRecords.vals()) { attendanceRecords.add(k, v) };
    for ((k, v) in stableRosterEntries.vals()) { rosterEntries.add(k, v) };
    for ((k, v) in stableSessions.vals()) { sessions.add(k, v) };
    for ((k, v) in stableEmployeeCustomIds.vals()) { employeeCustomIds.add(k, v) };
    for ((k, v) in stableAttendanceApprovers.vals()) { attendanceApprovers.add(k, v) };
  };

  func initAdmin() {
    if (not initialized) {
      employees.add(0, { id = 0; name = "Administrator"; username = "admin";
        passwordHash = "admin123"; role = #admin; hourlyRate = 0.0; shiftType = #both; isActive = true });
      employeeCustomIds.add(0, "ADMIN");
      employees.add(99, { id = 99; name = "Gatekeeper"; username = "gatekeeper";
        passwordHash = "gate123"; role = #gatekeeper; hourlyRate = 0.0; shiftType = #both; isActive = true });
      employeeCustomIds.add(99, "GK001");
      initialized := true;
    };
  };

  func getSession(token : Text) : ?Session {
    switch (sessions.get(token)) {
      case (?s) { if (s.expiresAt > Time.now()) { ?s } else { null } };
      case null { null };
    };
  };

  func calcNetHours(checkIn : Int, checkOut : Int) : Float {
    let diffNs : Int = checkOut - checkIn;
    let totalHours : Float = Float.fromInt64(Int64.fromInt(diffNs)) / 3_600_000_000_000.0;
    if (totalHours > 0.0 and totalHours < 11.5) {
      if (totalHours > 0.5) { totalHours - 0.5 } else { 0.0 };
    } else { totalHours };
  };

  func toEmployeeInfo(emp : Employee) : EmployeeInfo {
    let cid = switch (employeeCustomIds.get(emp.id)) {
      case (?c) { c };
      case null { emp.id.toText() };
    };
    { id = emp.id; customId = cid; name = emp.name; username = emp.username;
      passwordHash = emp.passwordHash; role = emp.role; hourlyRate = emp.hourlyRate;
      shiftType = emp.shiftType; isActive = emp.isActive };
  };

  func toAttendanceInfo(rec : AttendanceRecord) : AttendanceInfo {
    let approver = attendanceApprovers.get(rec.id);
    { id = rec.id; employeeId = rec.employeeId; date = rec.date;
      checkIn = rec.checkIn; checkOut = rec.checkOut;
      status = rec.status; markedBy = rec.markedBy;
      approvedBy = approver; netHours = rec.netHours };
  };

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  public func login(username : Text, password : Text) : async ?LoginResult {
    initAdmin();
    var result : ?LoginResult = null;
    for (emp in employees.values()) {
      if (emp.username == username and emp.passwordHash == password and emp.isActive) {
        let token = username # "_" # Time.now().toText();
        sessions.add(token, { employeeId = emp.id; role = emp.role;
          expiresAt = Time.now() + 86_400_000_000_000 });
        result := ?{ token; role = emp.role; employeeId = emp.id; name = emp.name };
      };
    };
    result;
  };

  public func validateSession(token : Text) : async Bool {
    switch (getSession(token)) {
      case (?_) { true };
      case null { false };
    };
  };

  public func changePassword(token : Text, oldPassword : Text, newPassword : Text) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        switch (employees.get(sess.employeeId)) {
          case null { false };
          case (?emp) {
            if (emp.passwordHash != oldPassword) { return false };
            employees.add(emp.id, { id = emp.id; name = emp.name; username = emp.username;
              passwordHash = newPassword; role = emp.role; hourlyRate = emp.hourlyRate;
              shiftType = emp.shiftType; isActive = emp.isActive });
            true;
          };
        };
      };
    };
  };

  // ─── EMPLOYEES ─────────────────────────────────────────────────────────────
  public func addEmployee(token : Text, customId : Text, name : Text, username : Text, password : Text,
    role : Role, hourlyRate : Float, shiftType : ShiftType) : async ?Nat {
    switch (getSession(token)) {
      case null { null };
      case (?sess) {
        if (sess.role != #admin) { return null };
        let id = nextEmployeeId;
        nextEmployeeId += 1;
        employees.add(id, { id; name; username; passwordHash = password; role; hourlyRate; shiftType; isActive = true });
        employeeCustomIds.add(id, customId);
        ?id;
      };
    };
  };

  public func updateEmployee(token : Text, id : Nat, name : Text, hourlyRate : Float, shiftType : ShiftType) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        if (sess.role != #admin) { return false };
        switch (employees.get(id)) {
          case null { false };
          case (?emp) {
            employees.add(id, { id = emp.id; name; username = emp.username; passwordHash = emp.passwordHash;
              role = emp.role; hourlyRate; shiftType; isActive = emp.isActive });
            true;
          };
        };
      };
    };
  };

  public func deleteEmployee(token : Text, id : Nat) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        if (sess.role != #admin) { return false };
        switch (employees.get(id)) {
          case null { false };
          case (?emp) {
            employees.add(id, { id = emp.id; name = emp.name; username = emp.username;
              passwordHash = emp.passwordHash; role = emp.role; hourlyRate = emp.hourlyRate;
              shiftType = emp.shiftType; isActive = false });
            true;
          };
        };
      };
    };
  };

  public query func getActiveEmployees(token : Text) : async [EmployeeInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?_) {
        employees.values()
          .filter(func(e : Employee) : Bool { e.isActive and e.role == #employee })
          .map(toEmployeeInfo)
          .toArray();
      };
    };
  };

  public query func getAllEmployees(token : Text) : async [EmployeeInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        if (sess.role != #admin) { return [] };
        employees.values().map(toEmployeeInfo).toArray();
      };
    };
  };

  public query func lookupEmployee(token : Text, employeeId : Nat) : async ?EmployeeInfo {
    switch (getSession(token)) {
      case null { null };
      case (?_) {
        switch (employees.get(employeeId)) {
          case null { null };
          case (?emp) { ?toEmployeeInfo(emp) };
        };
      };
    };
  };

  // ─── ROSTER ────────────────────────────────────────────────────────────────
  public func setRoster(token : Text, employeeId : Nat, date : Text, shiftType : ShiftType) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        if (sess.role != #admin) { return false };
        rosterEntries.add(employeeId.toText() # "-" # date, { employeeId; date; shiftType });
        true;
      };
    };
  };

  public query func getRosterByMonth(token : Text, yearMonth : Text) : async [RosterEntry] {
    switch (getSession(token)) {
      case null { [] };
      case (?_) {
        rosterEntries.values().filter(func(r : RosterEntry) : Bool {
          r.date.startsWith(#text yearMonth)
        }).toArray();
      };
    };
  };

  // ─── ATTENDANCE ────────────────────────────────────────────────────────────
  public func markAttendance(token : Text, employeeId : Nat, date : Text, checkIn : Int, isSelf : Bool) : async ?Nat {
    switch (getSession(token)) {
      case null { null };
      case (?sess) {
        let isGK = sess.role == #gatekeeper;
        let isAdm = sess.role == #admin;
        let isEmp = sess.role == #employee and sess.employeeId == employeeId;
        if (not isGK and not isAdm and not isEmp) { return null };
        let id = nextAttendanceId;
        nextAttendanceId += 1;
        attendanceRecords.add(id, { id; employeeId; date;
          checkIn = ?checkIn; checkOut = null;
          status = if (isSelf and not isAdm and not isGK) { #pending } else { #approved };
          markedBy = if (isGK) { #gatekeeper } else if (isAdm) { #admin } else { #self_ };
          netHours = 0.0 });
        ?id;
      };
    };
  };

  public func checkOut(token : Text, recordId : Nat, checkOutTime : Int) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        switch (attendanceRecords.get(recordId)) {
          case null { false };
          case (?rec) {
            if (sess.employeeId != rec.employeeId and sess.role != #gatekeeper and sess.role != #admin) {
              return false;
            };
            let netHours = switch (rec.checkIn) {
              case null { 0.0 };
              case (?ci) { calcNetHours(ci, checkOutTime) };
            };
            attendanceRecords.add(recordId, { id = rec.id; employeeId = rec.employeeId; date = rec.date;
              checkIn = rec.checkIn; checkOut = ?checkOutTime;
              status = rec.status; markedBy = rec.markedBy; netHours });
            true;
          };
        };
      };
    };
  };

  public func approveAttendance(token : Text, recordId : Nat, approved : Bool) : async Bool {
    switch (getSession(token)) {
      case null { false };
      case (?sess) {
        if (sess.role != #admin and sess.role != #gatekeeper) { return false };
        switch (attendanceRecords.get(recordId)) {
          case null { false };
          case (?rec) {
            attendanceRecords.add(recordId, { id = rec.id; employeeId = rec.employeeId; date = rec.date;
              checkIn = rec.checkIn; checkOut = rec.checkOut;
              status = if (approved) { #approved } else { #rejected };
              markedBy = rec.markedBy; netHours = rec.netHours });
            if (approved) {
              let approverName = switch (employees.get(sess.employeeId)) {
                case (?emp) { emp.name };
                case null { if (sess.role == #admin) { "Admin" } else { "Gatekeeper" } };
              };
              attendanceApprovers.add(recordId, approverName);
            };
            true;
          };
        };
      };
    };
  };

  public query func getPendingAttendance(token : Text) : async [AttendanceInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        if (sess.role != #admin and sess.role != #gatekeeper) { return [] };
        attendanceRecords.values()
          .filter(func(r : AttendanceRecord) : Bool { r.status == #pending })
          .map(toAttendanceInfo)
          .toArray();
      };
    };
  };

  public query func getMyAttendance(token : Text, yearMonth : Text) : async [AttendanceInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        attendanceRecords.values()
          .filter(func(r : AttendanceRecord) : Bool {
            r.employeeId == sess.employeeId and r.date.startsWith(#text yearMonth)
          })
          .map(toAttendanceInfo)
          .toArray();
      };
    };
  };

  public query func getAttendanceByMonth(token : Text, yearMonth : Text) : async [AttendanceInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        if (sess.role != #admin) { return [] };
        attendanceRecords.values()
          .filter(func(r : AttendanceRecord) : Bool { r.date.startsWith(#text yearMonth) })
          .map(toAttendanceInfo)
          .toArray();
      };
    };
  };

  public query func getTodayAttendance(token : Text, date : Text) : async [AttendanceInfo] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        if (sess.role != #gatekeeper and sess.role != #admin) { return [] };
        attendanceRecords.values()
          .filter(func(r : AttendanceRecord) : Bool { r.date == date })
          .map(toAttendanceInfo)
          .toArray();
      };
    };
  };

  // ─── REPORTS ───────────────────────────────────────────────────────────────
  public query func getSalaryReport(token : Text, yearMonth : Text) : async [SalaryReport] {
    switch (getSession(token)) {
      case null { [] };
      case (?sess) {
        if (sess.role != #admin) { return [] };
        let monthRecs = attendanceRecords.values().filter(func(r : AttendanceRecord) : Bool {
          r.status == #approved and r.date.startsWith(#text yearMonth)
        }).toArray();
        employees.values().toArray().filterMap(func(emp : Employee) : ?SalaryReport {
          if (emp.role != #employee) { return null };
          var totalHours : Float = 0.0;
          for (rec in monthRecs.vals()) {
            if (rec.employeeId == emp.id) { totalHours += rec.netHours };
          };
          ?{ employeeId = emp.id; name = emp.name; totalHours;
             hourlyRate = emp.hourlyRate; totalSalary = totalHours * emp.hourlyRate };
        });
      };
    };
  };
};
