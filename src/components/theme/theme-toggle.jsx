import { Moon, Sun } from "lucide-react"
import { Button } from "../ui/button"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-full justify-start gap-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
    </Button>
  )
} 