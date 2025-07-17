import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "../../lib/AuthContext";
import { toast } from "sonner";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Successfully logged in!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to log in: " + error.message);
    }

    setLoading(false);
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      toast.success("Successfully logged in with Google!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to log in with Google: " + error.message);
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-center mb-8">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Welcome to PGO</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </a>
        </p>
      </motion.div>
    </AuthLayout>
  );
} 