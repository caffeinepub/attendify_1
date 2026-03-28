import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { resetAdminPasswordByCode } from "../utils/storage";

interface Props {
  open: boolean;
  onClose: () => void;
}

function roleToString(role: any): "admin" | "gatekeeper" | "employee" {
  if (role && "admin" in role) return "admin";
  if (role && "gatekeeper" in role) return "gatekeeper";
  return "employee";
}

export default function LoginModal({ open, onClose }: Props) {
  const { login } = useAuth();
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast.error("Connecting to server, please wait...");
      return;
    }
    setLoading(true);
    try {
      const result = await actor.login(username.trim(), password);
      const loginResult = result[0];
      if (!loginResult) {
        toast.error("Invalid username or password");
        setLoading(false);
        return;
      }
      login({
        token: loginResult.token,
        role: roleToString(loginResult.role),
        name: loginResult.name,
        employeeId: loginResult.employeeId.toString(),
      });
      toast.success(`Welcome, ${loginResult.name}!`);
      setLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPass.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    const ok = resetAdminPasswordByCode(recoveryCode, newPass);
    if (!ok) {
      toast.error("Invalid recovery code");
      return;
    }
    toast.success("Admin password reset locally. Please use the new password.");
    setShowForgot(false);
    setRecoveryCode("");
    setNewPass("");
    setConfirmPass("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="login.dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Sign in to <span className="admin-gradient-text">Attendify</span>
          </DialogTitle>
        </DialogHeader>

        {!showForgot ? (
          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              disabled={loading || !actor}
              data-ocid="login.submit_button"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Admin forgot password?{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => setShowForgot(true)}
              >
                Recover access
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the Emergency Recovery Code shown in Admin Settings, then
              set a new password.
            </p>
            <div className="space-y-2">
              <Label>Recovery Code</Label>
              <Input
                placeholder="e.g. ATTND-XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="New admin password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgot(false)}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
