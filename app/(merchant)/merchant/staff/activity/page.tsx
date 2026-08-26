"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ChevronLeft, ChevronRight, Search, Clock,
  User, Shield, TrendingUp, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMerchantStaff, useStaffActivityLog } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const ITEMS_PER_PAGE = 10;

export default function StaffActivityPage() {
  const { data: staff = [] } = useMerchantStaff();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: activity = [] } = useStaffActivityLog(filter);

  // Filter activities by search query
  const filteredActivity = searchQuery
    ? (activity as any[]).filter((a) =>
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activity;

  // Calculate pagination
  const totalPages = Math.ceil(filteredActivity.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedActivity = filteredActivity.slice(startIndex, endIndex);

  // Calculate stats
  const today = new Date().toDateString();
  const todayActivities = (activity as any[]).filter((a) => new Date(a.createdAt).toDateString() === today).length;
  const uniqueStaff = new Set((activity as any[]).map((a) => a.staff.id)).size;

  const ACTION_COLORS: Record<string, string> = {
    LOGIN: "bg-green-500/10 text-green-700 border-green-500/30",
    LOGOUT: "bg-red-500/10 text-red-700 border-red-500/30",
    SALE: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    REFUND: "bg-orange-500/10 text-orange-700 border-orange-500/30",
    PRODUCT_ADD: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    PRODUCT_EDIT: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
    PRODUCT_DELETE: "bg-pink-500/10 text-pink-700 border-pink-500/30",
    CUSTOMER_ADD: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
    EXPENSE_ADD: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Staff Activity</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Monitor what your team is doing in the store</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700">Total Activities</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{activity.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-full">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700">Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{todayActivities}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-full">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-700">Active Staff</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-900 mt-1">{uniqueStaff}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-full">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities by description, staff, or action..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm"
          />
        </div>
        <select
          className="h-9 sm:h-11 px-3 sm:px-4 rounded-lg border border-input bg-background text-xs sm:text-sm"
          value={filter ?? ""}
          onChange={(e) => {
            setFilter(e.target.value || undefined);
            setCurrentPage(1);
          }}
        >
          <option value="">All Staff</option>
          {(staff as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </motion.div>

      {/* Activity List */}
      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paginatedActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              </div>
            ) : (
              <>
                {paginatedActivity.map((a: any) => (
                  <Card key={a.id} className="group hover:border-primary/40 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors shrink-0">
                            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold truncate">{a.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {a.staff.name}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">·</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {a.staff.role.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] sm:text-[10px] px-2 py-0.5 border",
                            ACTION_COLORS[a.action] || "bg-slate-500/10 text-slate-700 border-slate-500/30"
                          )}
                        >
                          {a.action.replace("_", " ")}
                        </Badge>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredActivity.length)} of {filteredActivity.length} activities
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={currentPage === pageNum ? "default" : "outline"}
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-[10px] sm:text-xs"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}