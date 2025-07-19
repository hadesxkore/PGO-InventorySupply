import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { collection, query, orderBy, onSnapshot, where, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Box,
  Truck,
  Share,
  Maximize2
} from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  // State for various dashboard data
  const [stats, setStats] = useState({
    totalSupplies: 0,
    lowStockItems: 0,
    outOfStock: 0,
    totalDeliveries: 0,
    monthlyDeliveries: 0,
    totalReleases: 0
  });

  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [stockMovement, setStockMovement] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // Colors for charts
  const CHART_COLORS = {
    blue: ["#60A5FA", "#3B82F6", "#2563EB"],
    green: ["#34D399", "#10B981", "#059669"],
    purple: ["#A78BFA", "#8B5CF6", "#7C3AED"],
    red: ["#F87171", "#EF4444", "#DC2626"]
  };

  // Fetch real-time data
  useEffect(() => {
    // Fetch supplies data
    const suppliesQuery = query(collection(db, "supplies"), orderBy("name"));
    const unsubSupplies = onSnapshot(suppliesQuery, (snapshot) => {
      const supplies = [];
      let lowStock = 0;
      let outOfStock = 0;
      const categories = {};

      snapshot.forEach((doc) => {
        const supply = { id: doc.id, ...doc.data() };
        supplies.push(supply);
        
        // Calculate stats
        if (supply.quantity === 0) outOfStock++;
        if (supply.quantity > 0 && supply.quantity < 10) lowStock++;
        
        // Calculate category distribution
        if (supply.category) {
          categories[supply.category] = (categories[supply.category] || 0) + 1;
        }
      });

      // Update category distribution chart data
      const categoryData = Object.entries(categories).map(([name, value]) => ({
        name,
        value
      }));

      setStats(prev => ({
        ...prev,
        totalSupplies: supplies.length,
        lowStockItems: lowStock,
        outOfStock: outOfStock
      }));
      setCategoryDistribution(categoryData);

      // Set low stock alerts
      const alerts = supplies
        .filter(s => s.quantity < 10)
        .map(s => ({
          id: s.id,
          name: s.name,
          quantity: s.quantity,
          threshold: 10
        }));
      setLowStockAlerts(alerts);
    });

    // Fetch releases data
    const releasesQuery = query(collection(db, "releases"), orderBy("createdAt", "desc"));
    const unsubReleases = onSnapshot(releasesQuery, (snapshot) => {
      const releases = [];
      snapshot.forEach((doc) => {
        releases.push({ id: doc.id, ...doc.data() });
      });

      // Update releases stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCount = releases.filter(
        d => d.createdAt?.toDate() >= monthStart
      ).length;

      setStats(prev => ({
        ...prev,
        totalReleases: releases.length
      }));
    });

    // Fetch deliveries data
    const deliveriesQuery = query(
      collection(db, "deliveries"),
      orderBy("createdAt", "desc")
    );
    const unsubDeliveries = onSnapshot(deliveriesQuery, (snapshot) => {
      const deliveries = [];
      snapshot.forEach((doc) => {
        deliveries.push({ id: doc.id, ...doc.data() });
      });

      // Update delivery stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCount = deliveries.filter(
        d => d.createdAt?.toDate() >= monthStart
      ).length;

      setStats(prev => ({
        ...prev,
        totalDeliveries: deliveries.length,
        monthlyDeliveries: monthlyCount
      }));

      // Update recent deliveries
      setRecentDeliveries(deliveries.slice(0, 5));

      // Calculate stock movement data (last 7 days)
      const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date;
      }).reverse();

      const movementData = last7Days.map(date => {
        const dayDeliveries = deliveries.filter(d => {
          const deliveryDate = d.createdAt?.toDate();
          return deliveryDate &&
            deliveryDate.getDate() === date.getDate() &&
            deliveryDate.getMonth() === date.getMonth();
        });

        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          incoming: dayDeliveries.length,
          quantity: dayDeliveries.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0)
        };
      });

      setStockMovement(movementData);
    });

    return () => {
      unsubSupplies();
      unsubReleases();
      unsubDeliveries();
    };
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 max-w-[1800px] mx-auto"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>
        <p className="text-gray-600 dark:text-gray-300">Real-time inventory management statistics</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
      >
        {/* Total Supplies Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 border-none">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Supplies</p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                  {stats.totalSupplies}
                </h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12%</span>
              <span className="text-gray-600 dark:text-gray-300 ml-2">from last month</span>
            </div>
          </Card>
        </motion.div>

        {/* Total Releases Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/50 border-none">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Releases</p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                  {stats.totalReleases}
                </h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Share className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+8.2%</span>
              <span className="text-gray-600 dark:text-gray-300 ml-2">from last month</span>
            </div>
          </Card>
        </motion.div>

        {/* Monthly Deliveries Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-800/50 border-none">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Deliveries</p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                  {stats.monthlyDeliveries}
                </h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-500 font-medium">-3.1%</span>
              <span className="text-gray-600 dark:text-gray-300 ml-2">from last month</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Stock Movement Chart */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Inventory Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overview of current inventory state</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Supplies</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Deliveries</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Releases</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: 'Current Status',
                    totalSupplies: stats.totalSupplies,
                    totalDeliveries: stats.totalDeliveries,
                    totalReleases: stats.totalReleases
                  }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barSize={80}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 14, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 14, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-4 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold text-gray-900 dark:text-white mb-3">Current Status</p>
                          <div className="space-y-2">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              Total Supplies: {payload[0]?.value || 0} items
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Total Deliveries: {payload[1]?.value || 0} items
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              Total Releases: {payload[2]?.value || 0} items
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="totalSupplies" 
                  name="Total Supplies"
                  fill={CHART_COLORS.blue[1]} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="totalDeliveries" 
                  name="Total Deliveries"
                  fill={CHART_COLORS.green[1]} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="totalReleases" 
                  name="Total Releases"
                  fill={CHART_COLORS.red[1]} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Inventory Overview Chart */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Inventory Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Total Supplies', value: stats.totalSupplies, color: CHART_COLORS.blue[1] },
                    { name: 'Total Deliveries', value: stats.totalDeliveries, color: CHART_COLORS.green[1] },
                    { name: 'Total Releases', value: stats.totalReleases, color: CHART_COLORS.purple[1] }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    CHART_COLORS.blue[1],
                    CHART_COLORS.green[1],
                    CHART_COLORS.purple[1]
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Supplies</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSupplies}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deliveries</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Releases</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.totalReleases}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deliveries */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Deliveries</h3>
          <div className="space-y-4">
            {recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{delivery.supplyName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Quantity: {delivery.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {delivery.createdAt?.toDate().toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {delivery.deliveredBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Low Stock Alerts</h3>
              <div className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                {lowStockAlerts.length} items
              </div>
            </div>
            {lowStockAlerts.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/supplies')}
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                View All ({lowStockAlerts.length})
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {lowStockAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-full">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{alert.name}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Only {alert.quantity} items remaining
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/supplies')}
                  className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                >
                  Restock
                </Button>
              </div>
            ))}
            {lowStockAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No low stock alerts
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
} 