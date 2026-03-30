import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Globe, Award, Users } from "lucide-react";

export default function About() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">About This Platform</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The official AI-powered information portal for Integral University, Lucknow.
            </p>
          </motion.div>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardContent className="p-6 flex gap-4"><div className="rounded-xl bg-primary/10 p-3 h-fit"><GraduationCap className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold text-lg mb-2">AI-Powered Assistant</h3><p className="text-sm text-muted-foreground">Our intelligent chatbot provides instant answers about courses, admissions, fees, campus facilities, and more.</p></div></CardContent></Card>
            <Card><CardContent className="p-6 flex gap-4"><div className="rounded-xl bg-primary/10 p-3 h-fit"><Globe className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold text-lg mb-2">Comprehensive Information</h3><p className="text-sm text-muted-foreground">Access detailed information about all university programs, fee structures, admission procedures, and campus facilities.</p></div></CardContent></Card>
            <Card><CardContent className="p-6 flex gap-4"><div className="rounded-xl bg-primary/10 p-3 h-fit"><Award className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold text-lg mb-2">NAAC A+ Accredited</h3><p className="text-sm text-muted-foreground">Integral University is accredited with an A+ grade by NAAC and recognized by UGC, AICTE, NMC, BCI, NCTE, and more.</p></div></CardContent></Card>
            <Card><CardContent className="p-6 flex gap-4"><div className="rounded-xl bg-primary/10 p-3 h-fit"><Users className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold text-lg mb-2">For Students & Parents</h3><p className="text-sm text-muted-foreground">Designed to help prospective students, current students, and parents find information about Integral University.</p></div></CardContent></Card>
          </div>
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Integral University. All rights reserved.</p>
            <p className="mt-1">Kursi Road, Lucknow, UP - 226026 | info@iul.ac.in | +91 93351 77775</p>
          </div>
        </div>
      </section>
    </div>
  );
}
