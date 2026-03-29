import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";

type Course = {
  id: string;
  name: string;
  department: string;
  duration: number;
  annual_fee: number;
  total_fee: number;
  description: string | null;
};

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [courseDialog, setCourseDialog] = useState(false);
  const [faqDialog, setFaqDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Course form
  const [cName, setCName] = useState("");
  const [cDept, setCDept] = useState("");
  const [cDur, setCDur] = useState("");
  const [cAnnual, setCAnnual] = useState("");
  const [cTotal, setCTotal] = useState("");
  const [cDesc, setCDesc] = useState("");

  // FAQ form
  const [fQ, setFQ] = useState("");
  const [fA, setFA] = useState("");
  const [fCat, setFCat] = useState("general");

  useEffect(() => {
    checkAuth();
    fetchCourses();
    fetchFaqs();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) { navigate("/admin"); }
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("department");
    setCourses((data as Course[]) || []);
  };

  const fetchFaqs = async () => {
    const { data } = await supabase.from("faqs").select("*").order("category");
    setFaqs((data as FAQ[]) || []);
  };

  const resetCourseForm = () => { setCName(""); setCDept(""); setCDur(""); setCAnnual(""); setCTotal(""); setCDesc(""); setEditingCourse(null); };
  const resetFaqForm = () => { setFQ(""); setFA(""); setFCat("general"); setEditingFaq(null); };

  const openEditCourse = (c: Course) => {
    setEditingCourse(c); setCName(c.name); setCDept(c.department); setCDur(String(c.duration));
    setCAnnual(String(c.annual_fee)); setCTotal(String(c.total_fee)); setCDesc(c.description || "");
    setCourseDialog(true);
  };

  const openEditFaq = (f: FAQ) => {
    setEditingFaq(f); setFQ(f.question); setFA(f.answer); setFCat(f.category); setFaqDialog(true);
  };

  const saveCourse = async () => {
    const payload = { name: cName, department: cDept, duration: Number(cDur), annual_fee: Number(cAnnual), total_fee: Number(cTotal), description: cDesc || null };
    if (editingCourse) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingCourse.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editingCourse ? "Course updated" : "Course added" });
    setCourseDialog(false); resetCourseForm(); fetchCourses();
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Course deleted" }); fetchCourses();
  };

  const saveFaq = async () => {
    const payload = { question: fQ, answer: fA, category: fCat };
    if (editingFaq) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("faqs").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editingFaq ? "FAQ updated" : "FAQ added" });
    setFaqDialog(false); resetFaqForm(); fetchFaqs();
  };

  const deleteFaq = async (id: string) => {
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "FAQ deleted" }); fetchFaqs();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage courses, fees, and FAQs</p>
        </div>
        <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="mb-6">
          <TabsTrigger value="courses">Courses & Fees</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        {/* COURSES TAB */}
        <TabsContent value="courses">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{courses.length} Courses</h2>
            <Dialog open={courseDialog} onOpenChange={(o) => { setCourseDialog(o); if (!o) resetCourseForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingCourse ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Course Name</Label><Input value={cName} onChange={(e) => setCName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Department</Label><Input value={cDept} onChange={(e) => setCDept(e.target.value)} /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Duration (yrs)</Label><Input type="number" value={cDur} onChange={(e) => setCDur(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Annual Fee</Label><Input type="number" value={cAnnual} onChange={(e) => setCAnnual(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Total Fee</Label><Input type="number" value={cTotal} onChange={(e) => setCTotal(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} /></div>
                  <Button className="w-full" onClick={saveCourse}>{editingCourse ? "Update" : "Add"} Course</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Annual Fee</TableHead>
                  <TableHead className="text-right">Total Fee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.department}</TableCell>
                    <TableCell>{c.duration}Y</TableCell>
                    <TableCell className="text-right">₹{c.annual_fee.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">₹{c.total_fee.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditCourse(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCourse(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* FAQS TAB */}
        <TabsContent value="faqs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{faqs.length} FAQs</h2>
            <Dialog open={faqDialog} onOpenChange={(o) => { setFaqDialog(o); if (!o) resetFaqForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add FAQ</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Question</Label><Input value={fQ} onChange={(e) => setFQ(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Answer</Label><Textarea value={fA} onChange={(e) => setFA(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Category</Label><Input value={fCat} onChange={(e) => setFCat(e.target.value)} placeholder="general, courses, fees, admissions" /></div>
                  <Button className="w-full" onClick={saveFaq}>{editingFaq ? "Update" : "Add"} FAQ</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {faqs.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex items-start justify-between p-4">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-primary uppercase">{f.category}</span>
                    <h3 className="font-semibold mt-1">{f.question}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{f.answer}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => openEditFaq(f)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteFaq(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
