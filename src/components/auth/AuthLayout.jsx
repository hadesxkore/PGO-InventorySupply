import { motion } from "framer-motion";
import BataanLogo from "/images/bataan-logo.png";

const ModernBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700"></div>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/30 to-purple-500/30 animate-gradient"></div>
      
      {/* Floating elements */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
              x: [0, Math.random() * 50, 0],
              y: [0, Math.random() * 50, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"></div>
    </div>
  );
};

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Modern Background and Logo */}
      <div className="w-[60%] relative overflow-hidden bg-blue-700">
        <ModernBackground />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo Container */}
            <motion.div
              className="relative w-48 h-48 mx-auto mb-12"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              {/* Glowing ring animation */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(45deg, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5))",
                  filter: "blur(20px)",
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
              
              {/* Logo */}
              <div className="relative z-10 w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 p-4">
                <img
                  src={BataanLogo}
                  alt="Bataan Logo"
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              </div>
            </motion.div>

            {/* Text Content */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h1 className="text-5xl font-bold text-white tracking-tight">
                PGO Bunker Bataan
              </h1>
              <p className="text-xl text-blue-100/80">
                Inventory Management System
              </p>
              
              {/* Additional tagline */}
              <motion.p
                className="mt-6 text-sm text-blue-100/60 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Streamline your inventory management with our modern and efficient system
              </motion.p>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/50 to-transparent"></div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="w-[40%] bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="backdrop-blur-sm"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 