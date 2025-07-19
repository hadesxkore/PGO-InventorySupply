import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../lib/AuthContext";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  Eye,
  EyeOff,
  Github,
  Facebook
} from "lucide-react";

export function Account() {
  const { user, updatePassword, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get user initials for avatar
  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/wrong-password') {
        toast.error("Current password is incorrect");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Please log out and log back in before changing your password");
      } else {
        toast.error("Failed to update password: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Account Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your account settings and preferences</p>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Profile Overview Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-4"
        >
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {getInitials(user?.email || '')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
                {user?.email?.split('@')[0]}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{user?.email}</p>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-6">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Account</span>
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-8"
        >
          <Card className="p-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">About Us</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={user?.email}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Input
                      type="text"
                      value="Administrator"
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Created</Label>
                    <Input
                      type="text"
                      value={user?.metadata?.creationTime || "Not available"}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">About the Developers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Kobie */}
                    <div className="space-y-4">
                      <div className="aspect-square w-48 mx-auto overflow-hidden rounded-xl">
                        <img
                          src="images/kobie.jpg"
                          alt="Kobie O. Villanueva"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">Kobie O. Villanueva</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Web Developer</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Bachelor of Science in Information Technology<br />
                          Major in Network and Web Application<br />
                          Bataan Peninsula State University - Main Campus
                        </p>
                        <div className="flex justify-center gap-3 mt-4">
                          <Button variant="outline" size="icon" asChild>
                            <a href="mailto:kobie.villanueva@example.com" target="_blank" rel="noopener noreferrer">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="icon" asChild>
                            <a href="https://www.facebook.com/villanuevafreeze.18" target="_blank" rel="noopener noreferrer">
                              <Facebook className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="icon" asChild>
                            <a href="https://github.com/hadesxkore" target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Peter */}
                    <div className="space-y-4">
                      <div className="aspect-square w-48 mx-auto overflow-hidden rounded-xl">
                        <img
                          src="images/peter.jpg"
                          alt="Peter Carlos V. Ronquillo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">Peter Carlos V. Ronquillo</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Web Developer</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Bachelor of Science in Information Technology<br />
                          Major in Network and Web Application<br />
                          Bataan Peninsula State University - Main Campus
                        </p>
                        <div className="flex justify-center gap-3 mt-4">
                          <Button variant="outline" size="icon" asChild>
                            <a href="mailto:peter.ronquillo@example.com" target="_blank" rel="noopener noreferrer">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="icon" asChild>
                            <a href="https://www.facebook.com/paperonce" target="_blank" rel="noopener noreferrer">
                              <Facebook className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="icon" asChild>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 