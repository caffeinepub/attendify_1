import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Fingerprint,
  Shield,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

interface Props {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: Props) {
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center text-white font-black text-lg shadow">
              A
            </div>
            <span className="text-xl font-bold">Attendify</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a
              href="#portals"
              className="hover:text-foreground transition-colors"
            >
              Portals
            </a>
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
          </div>
          <Button
            onClick={onLogin}
            className="bg-gradient-to-r from-[#2E7BFF] to-[#7C3AED] text-white hover:opacity-90"
            data-ocid="nav.primary_button"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#0B1E3A", minHeight: 520 }}
      >
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, #00C8B0, transparent)",
            }}
          />
          <div
            className="absolute top-10 right-0 w-80 h-80 rounded-full opacity-25"
            style={{
              background: "radial-gradient(circle, #2E7BFF, transparent)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #7C3AED, transparent)",
            }}
          />
          <div
            className="absolute top-1/2 right-1/4 w-56 h-56 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #FF7A18, transparent)",
            }}
          />
          <div
            className="absolute bottom-10 right-10 w-48 h-48 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #31D07F, transparent)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20">
              🎯 Smart Attendance Management
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Track Attendance
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #31D07F, #00C8B0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Effortlessly
              </span>
            </h1>
            <p className="text-lg text-blue-100/80 mb-10 max-w-xl mx-auto">
              Complete attendance solution with role-based portals for Admin,
              Gatekeeper, and Employees. Shift management, biometric support &
              detailed reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onLogin}
                size="lg"
                className="text-base px-8 py-6 rounded-full font-bold shadow-lg"
                style={{ background: "#31D07F", color: "#0B1E3A" }}
                data-ocid="hero.primary_button"
              >
                Get Started — Login
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 rounded-full font-bold border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <a href="#portals">Explore Portals</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Portal Cards */}
      <section id="portals" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Three Powerful Portals</h2>
          <p className="text-muted-foreground">
            Role-based access for every team member
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Admin */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-0 shadow-card hover:shadow-xl transition-shadow">
              <div className="admin-gradient h-2" />
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl admin-gradient flex items-center justify-center text-white mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Admin Portal</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Full control over employees, shifts, attendance, and reports
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Manage employees & roles",
                    "Shift & roster creation",
                    "Approve attendance",
                    "Salary & hour reports",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onLogin}
                  className="mt-5 w-full admin-gradient text-white hover:opacity-90 rounded-full"
                  data-ocid="admin.open_modal_button"
                >
                  Admin Login
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gatekeeper */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-0 shadow-card hover:shadow-xl transition-shadow">
              <div className="gatekeeper-gradient h-2" />
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl gatekeeper-gradient flex items-center justify-center text-white mb-4">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gatekeeper Portal</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Mark attendance manually or via biometric for all employees
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Manual attendance marking",
                    "Biometric (WebAuthn)",
                    "Approve self check-ins",
                    "Real-time today's list",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onLogin}
                  className="mt-5 w-full gatekeeper-gradient text-white hover:opacity-90 rounded-full"
                  data-ocid="gatekeeper.open_modal_button"
                >
                  Gatekeeper Login
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Employee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-0 shadow-card hover:shadow-xl transition-shadow">
              <div className="employee-gradient h-2" />
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-2xl employee-gradient flex items-center justify-center text-white mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Employee Portal</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Self check-in/out and view your attendance history
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Self check-in & check-out",
                    "View attendance history",
                    "Track hours & status",
                    "Change password",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onLogin}
                  className="mt-5 w-full employee-gradient text-white hover:opacity-90 rounded-full"
                  data-ocid="employee.open_modal_button"
                >
                  Employee Login
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-muted-foreground">
              Built for organizations of all sizes
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Clock,
                label: "Shift Management",
                desc: "Day, night, and rotational shifts with roster creation",
                color: "#2E7BFF",
              },
              {
                icon: BarChart3,
                label: "Salary Reports",
                desc: "Monthly hours & salary calculation with export",
                color: "#31D07F",
              },
              {
                icon: Bell,
                label: "Approval Workflow",
                desc: "Self check-ins require gatekeeper/admin approval",
                color: "#FF7A18",
              },
              {
                icon: Calendar,
                label: "Lunch Deduction",
                desc: "Automatic 30-min lunch deduction for shorter shifts",
                color: "#7C3AED",
              },
            ].map(({ icon: Icon, label, desc, color }) => (
              <Card key={label} className="border-0 shadow-card">
                <CardContent className="p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h4 className="font-semibold mb-1">{label}</h4>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>
          © {year}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
