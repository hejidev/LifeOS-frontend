"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCog, Plus, Trash2, KeyRound, Search, Filter, 
  MoreVertical, Edit, Shield, ShieldAlert, Clock, 
  Mail, Phone, MapPin, Calendar, User, AlertTriangle,
  CheckCircle, XCircle, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMerchantStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const ROLES = ["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"];

const ROLE_COLORS = {
  MANAGER: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  CASHIER: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  SALES_REP: "bg-green-500/10 text-green-700 border-green-500/20",
  INVENTORY_CLERK: "bg-orange-500/10 text-orange-700 border-orange-500/20",
};

const ROLE_ICONS = {
  MANAGER: Shield,
  CASHIER: User,
  SALES_REP: Activity,
  INVENTORY_CLERK: Filter,
};

export default function StaffPage() {
  const { data: staff = [], isLoading } = useMerchantStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  const [form, setForm] = useState({ 
    name: "", email: "", phone: "", address: "", age: "", sex: "", 
    tribe: "", religion: "", role: "CASHIER", pin: "" 
  });

  const filteredStaff = (staff as any[]).filter((s) => {
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);
    const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createStaff.mutate(
      { 
        ...form, 
        email: form.email || undefined, 
        phone: form.phone || undefined,
        address: form.address || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        sex: form.sex || undefined,
        tribe: form.tribe || undefined,
        religion: form.religion || undefined,
      },
      { onSuccess: () => { 
        setOpen(false); 
        setForm({ name: "", email: "", phone: "", address: "", age: "", sex: "", tribe: "", religion: "", role: "CASHIER", pin: "" }); 
      }}
    );
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateStaff.mutate(
      { 
        id: selectedStaff.id,
        data: {
          ...form,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          age: form.age ? parseInt(form.age) : undefined,
          sex: form.sex || undefined,
          tribe: form.tribe || undefined,
          religion: form.religion || undefined,
        }
      },
      { onSuccess: () => { 
        setEditOpen(false); 
        setSelectedStaff(null);
      }}
    );
  }

  function openEditModal(s: any) {
    setSelectedStaff(s);
    setForm({
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      age: s.age?.toString() || "",
      sex: s.sex || "",
      tribe: s.tribe || "",
      religion: s.religion || "",
      role: s.role,
      pin: "",
    });
    setEditOpen(true);
  }

  function handleDelete(s: any) {
    setSelectedStaff(s);
    setDeleteOpen(true);
  }

  function confirmDelete() {
    deleteStaff.mutate(selectedStaff.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedStaff(null);
      }
    });
  }

  function toggleStatus(s: any) {
    updateStaff.mutate({ 
      id: s.id, 
      data: { status: s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } 
    });
  }

  const activeCount = (staff as any[]).filter((s) => s.status === "ACTIVE").length;
  const suspendedCount = (staff as any[]).filter((s) => s.status === "SUSPENDED").length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header Section */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            Staff Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 sm:mt-2">Manage your team, roles, and access permissions</p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg" className="shadow-lg h-9 sm:h-11 text-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Staff Member
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700">Total Staff</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{staff.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-full">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700">Active</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{activeCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700">Suspended</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-900 mt-1">{suspendedCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-red-500/20 rounded-full">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
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
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 h-9 sm:h-11 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 sm:h-11 px-3 sm:px-4 rounded-lg border border-input bg-background text-xs sm:text-sm"
        >
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 sm:h-11 px-3 sm:px-4 rounded-lg border border-input bg-background text-xs sm:text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </motion.div>

      {/* Staff List */}
      <motion.div variants={item} className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading staff...</div>
        ) : filteredStaff.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <UserCog className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {staff.length === 0 ? "No staff members yet. Add your first team member!" : "No staff match your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredStaff.map((s) => {
              const RoleIcon = ROLE_ICONS[s.role as keyof typeof ROLE_ICONS] || User;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className={`transition-all duration-200 hover:shadow-lg hover:border-primary/30 ${s.status === "SUSPENDED" ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className={`p-1.5 sm:p-2 rounded-lg ${ROLE_COLORS[s.role as keyof typeof ROLE_COLORS]}`}>
                              <RoleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-semibold truncate">{s.name}</h3>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                                <Badge className={`text-[9px] sm:text-xs ${ROLE_COLORS[s.role as keyof typeof ROLE_COLORS]}`}>
                                  {s.role.replace("_", " ")}
                                </Badge>
                                <Badge variant={s.status === "ACTIVE" ? "default" : "destructive"} className="text-[9px] sm:text-xs">
                                  {s.status === "ACTIVE" ? "Active" : "Suspended"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[10px] sm:text-sm">
                            {s.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span className="truncate">{s.email}</span>
                              </div>
                            )}
                            {s.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span>{s.phone}</span>
                              </div>
                            )}
                            {s.address && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span className="truncate">{s.address}</span>
                              </div>
                            )}
                            {s.age && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span>{s.age} years old</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-[9px] sm:text-xs text-muted-foreground">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span>
                              {s.lastActiveAt 
                                ? `Last active ${new Date(s.lastActiveAt).toLocaleDateString()} at ${new Date(s.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : "Never clocked in"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={s.status === "ACTIVE" ? "outline" : "default"}
                            onClick={() => toggleStatus(s)}
                            className={s.status === "ACTIVE" ? "h-8 sm:h-9 text-xs" : "h-8 sm:h-9 text-xs bg-green-600 hover:bg-green-700"}
                          >
                            {s.status === "ACTIVE" ? (
                              <>
                                <ShieldAlert className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Suspend
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Activate
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(s)} className="h-8 sm:h-9 text-xs">
                            <Edit className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Add Staff Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Staff Member</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Create a new staff account and assign their role</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Additional Details</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-3 sm:space-y-4 mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Full Name *</Label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
                    placeholder="Enter full name"
                    required 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Role *</Label>
                  <select 
                    className="flex h-9 sm:h-10 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" 
                    value={form.role} 
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
                    placeholder="email@example.com"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Phone</Label>
                  <Input 
                    value={form.phone} 
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} 
                    placeholder="+234 800 000 0000"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">POS PIN (4–6 digits) *</Label>
                  <Input 
                    value={form.pin} 
                    onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} 
                    maxLength={6} 
                    placeholder="••••"
                    required 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </TabsContent>
              <TabsContent value="details" className="space-y-3 sm:space-y-4 mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Address</Label>
                  <Input 
                    value={form.address} 
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} 
                    placeholder="Street address"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Age</Label>
                    <Input 
                      type="number" 
                      min="16" 
                      max="100" 
                      value={form.age} 
                      onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} 
                      placeholder="25"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Sex</Label>
                    <Input 
                      value={form.sex} 
                      onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))} 
                      placeholder="Male/Female"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Tribe</Label>
                    <Input 
                      value={form.tribe} 
                      onChange={(e) => setForm((f) => ({ ...f, tribe: e.target.value }))} 
                      placeholder="e.g., Yoruba"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Religion</Label>
                    <Input 
                      value={form.religion} 
                      onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))} 
                      placeholder="e.g., Christianity"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 sm:h-10 text-sm">Cancel</Button>
              <Button type="submit" disabled={createStaff.isPending} className="h-9 sm:h-10 text-sm">
                {createStaff.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </DialogFooter>
            {createStaff.isError && (
              <p className="text-xs text-destructive text-center">{(createStaff.error as Error).message}</p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Staff Member</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update staff information and credentials</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4 pt-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Additional Details</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-3 sm:space-y-4 mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Full Name *</Label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
                    required 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Role *</Label>
                  <select 
                    className="flex h-9 sm:h-10 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" 
                    value={form.role} 
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Phone</Label>
                  <Input 
                    value={form.phone} 
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">New POS PIN (leave blank to keep current)</Label>
                  <Input 
                    value={form.pin} 
                    onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} 
                    maxLength={6} 
                    placeholder="••••"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </TabsContent>
              <TabsContent value="details" className="space-y-3 sm:space-y-4 mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Address</Label>
                  <Input 
                    value={form.address} 
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} 
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Age</Label>
                    <Input 
                      type="number" 
                      min="16" 
                      max="100" 
                      value={form.age} 
                      onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} 
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Sex</Label>
                    <Input 
                      value={form.sex} 
                      onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))} 
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Tribe</Label>
                    <Input 
                      value={form.tribe} 
                      onChange={(e) => setForm((f) => ({ ...f, tribe: e.target.value }))} 
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Religion</Label>
                    <Input 
                      value={form.religion} 
                      onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))} 
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="h-9 sm:h-10 text-sm">Cancel</Button>
              <Button type="submit" disabled={updateStaff.isPending} className="h-9 sm:h-10 text-sm">
                {updateStaff.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
            {updateStaff.isError && (
              <p className="text-xs text-destructive text-center">{(updateStaff.error as Error).message}</p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Delete Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete <strong>{selectedStaff?.name}</strong>? This action cannot be undone and will permanently remove this staff member from your system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-9 sm:h-10 text-sm">Cancel</Button>
            <Button 
              onClick={confirmDelete} 
              variant="destructive"
              disabled={deleteStaff.isPending}
              className="h-9 sm:h-10 text-sm"
            >
              {deleteStaff.isPending ? "Deleting..." : "Delete Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}