import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth } from "../../lib/AuthContext";
import { ThemeToggle } from "../theme/theme-toggle";
import { useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Package,
  FileText,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Share2,
  FileOutput
} from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get user initials for avatar
  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Delivery', icon: Truck, path: '/delivery' },
    { name: 'Supplies/Stock', icon: Package, path: '/supplies' },
    { name: 'Release Supply', icon: Share2, path: '/release-supply' },
    { name: 'Generate/Export', icon: FileOutput, path: '/generate-export' },
    { name: 'Reports', icon: FileText, path: '/reports' },
    { name: 'Account', icon: User, path: '/account' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? "6rem" : "20rem" }}
      className={cn(
        "relative h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute -right-5 top-8 z-50 h-10 w-10 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
          "hover:bg-gray-50 dark:hover:bg-gray-800"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      {/* User Profile Section */}
      <div className={cn(
        "p-6 border-b border-gray-200 dark:border-gray-800",
        "transition-all duration-300 ease-in-out"
      )}>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-600 text-white text-lg">
              {getInitials(user?.email || '')}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-base font-medium text-gray-700 dark:text-gray-200 truncate">
                {user?.email}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 space-y-2.5">
        {navigationItems.map((item) => (
          <Link key={item.name} to={item.path}>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-12 justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950",
                location.pathname === item.path && "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
                isCollapsed ? "px-3" : "px-4",
                "text-base"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Theme Toggle and Logout Section */}
      <div className={cn(
        "p-4 border-t border-gray-200 dark:border-gray-800 space-y-2.5",
        "transition-all duration-300 ease-in-out"
      )}>
        <Button
          variant="ghost"
          className={cn(
            "w-full h-12 justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400",
            isCollapsed ? "px-3" : "px-4",
            "text-base"
          )}
          onClick={() => {
            const theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            document.documentElement.classList.toggle('dark');
          }}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {!isCollapsed && <span>Toggle Theme</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full h-12 justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950",
            isCollapsed ? "px-3" : "px-4",
            "text-base"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </motion.div>
  );
} 