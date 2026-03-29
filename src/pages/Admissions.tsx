import { motion } from "framer-motion";
import { ClipboardList, FileText, CreditCard, CheckCircle2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: ClipboardList, title: "Register Online", desc: "Create an account on the university portal and fill in basic details." },
  { icon: FileText, title: "Fill Application", desc: "Complete the application form with academic details, upload documents and photograph." },
  { icon: CreditCard, title: "Pay Application Fee", desc: "Pay the non-refundable application fee online via UPI, card, or net banking." },
  { icon: CheckCircle2, title: "Entrance / Merit", desc: "Appear for the entrance test or qualify on merit basis depending on the program." },
];

const eligibility = [
  { program: "B.Tech / B.E.", criteria: "10+2 with Physics, Chemistry, Mathematics with minimum 45% marks" },
  { program: "B.Pharm", criteria: "10+2 with Physics, Chemistry, Biology/Mathematics with minimum 45% marks" },
  { program: "MBBS / BDS", criteria: "10+2 with PCB, NEET qualified" },
  { program: "B.Com / BBA", criteria: "10+2 from any recognized board with minimum 45% marks" },
  { program: "M.Tech", criteria: "B.Tech in relevant discipline with minimum 50% marks, GATE preferred" },
  { program: "MBA", criteria: "Bachelor's degree with minimum 50% marks, MAT/CAT/CMAT score" },
  { program: "Ph.D.", criteria: "Master's degree with minimum 55% marks, NET/SLET qualified candidates preferred" },
];

const dates = [
  { event: "Application Opens", date: "January 15, 2026" },
  { event: "Early Bird Deadline", date: "March 31, 2026" },
  { event: "Entrance Test", date: "May 15, 2026" },
  { event: "Results Declaration", date: "June 1, 2026" },
  { event: "Counselling Begins", date: "June 15, 2026" },
  { event: "Classes Start", date: "August 1, 2026" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Admissions() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">Admissions</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Begin your academic journey at Integral University. Follow our simple admission process 
              and join a community of 15,000+ students.
            </p>
            <Button size="lg" className="mt-6">Apply Now →</Button>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-10">Admission Process</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div key={step.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="relative h-full overflow-hidden">
                  <div className="absolute -right-3 -top-3 text-7xl font-bold text-primary/5">{i + 1}</div>
                  <CardContent className="flex flex-col items-start gap-3 p-6">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-y bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-8">Eligibility Criteria</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {eligibility.map((e, i) => (
              <motion.div key={e.program} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-primary">{e.program}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{e.criteria}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Dates */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-8">Important Dates</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {dates.map((d, i) => (
                  <motion.div
                    key={d.event}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="flex items-center gap-4 rounded-lg bg-secondary/50 p-3"
                  >
                    <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{d.event}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">{d.date}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
