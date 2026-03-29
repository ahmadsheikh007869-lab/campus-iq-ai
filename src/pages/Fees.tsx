import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type Course = {
  id: string;
  name: string;
  department: string;
  duration: number;
  annual_fee: number;
  total_fee: number;
  description: string | null;
};

export default function Fees() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from("courses").select("*").order("department");
      setCourses((data as Course[]) || []);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const departments = [...new Set(courses.map((c) => c.department))];
  const filtered = courses.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || c.department === deptFilter;
    return matchSearch && matchDept;
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">Fee Structure</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Explore course-wise fee details. Use the search and filter options to find specific programs.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {courses.length === 0
                  ? "No courses have been added yet. Check back soon or contact the admin."
                  : "No courses match your search criteria."}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Annual Fee</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.department}</TableCell>
                        <TableCell>{c.duration} {c.duration === 1 ? "Year" : "Years"}</TableCell>
                        <TableCell className="text-right">{fmt(c.annual_fee)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{fmt(c.total_fee)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-4 md:hidden">
                {filtered.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-sm text-muted-foreground">{c.department}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span>{c.duration} {c.duration === 1 ? "Year" : "Years"}</span>
                        <span className="font-semibold text-primary">{fmt(c.total_fee)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{fmt(c.annual_fee)} / year</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
          <p className="mt-4 text-sm text-muted-foreground">Showing {filtered.length} of {courses.length} courses</p>
        </div>
      </section>
    </div>
  );
}
