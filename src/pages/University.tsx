import { motion } from "framer-motion";
import { Building2, FlaskConical, Dumbbell, BookOpen, UtensilsCrossed, HeartPulse, Wifi, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const facilities = [
  { icon: Home, title: "Hostels", desc: "Separate boys & girls hostels with modern amenities and mess facility" },
  { icon: FlaskConical, title: "Laboratories", desc: "State-of-the-art labs for engineering, sciences, and medical programs" },
  { icon: Dumbbell, title: "Sports Complex", desc: "Cricket, football, basketball, indoor games, and gymnasium" },
  { icon: BookOpen, title: "Central Library", desc: "100,000+ books, digital journals, and 24/7 e-resource access" },
  { icon: UtensilsCrossed, title: "Cafeteria", desc: "Multiple food courts with hygienic and affordable meals" },
  { icon: HeartPulse, title: "Medical Center", desc: "On-campus health center with qualified medical staff" },
  { icon: Wifi, title: "Wi-Fi Campus", desc: "High-speed internet across the entire campus" },
  { icon: Building2, title: "Auditorium", desc: "Multi-purpose auditorium for events and seminars" },
];

const milestones = [
  { year: "2004", event: "University established under UGC Act" },
  { year: "2007", event: "NAAC Accreditation received" },
  { year: "2010", event: "Engineering programs accredited by NBA" },
  { year: "2014", event: "10th Anniversary — 10,000 students enrolled" },
  { year: "2018", event: "Ranked among top universities in UP" },
  { year: "2022", event: "International collaborations with 20+ universities" },
  { year: "2024", event: "20 Years of Academic Excellence" },
  { year: "2025", event: "Expansion of academic programs, upgraded campus infrastructure, and AI-based digital learning systems introduced" },
  { year: "2026", event: "Recognized as a leading institution in innovation, smart campus development, and advanced research collaborations" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function University() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">About Integral University</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Founded in 2004 by the Integral Education Society, Integral University is located on Kursi Road, Lucknow, 
              Uttar Pradesh. Spread across a lush green campus, it is recognized by UGC and approved by AICTE, BCI, NCTE, 
              and other regulatory bodies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* History & Milestones */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-10">Milestones</h2>
          <div className="relative border-l-2 border-primary/20 pl-8 space-y-8">
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative"
              >
                <div className="absolute -left-[2.6rem] top-1 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                <span className="text-sm font-semibold text-primary">{m.year}</span>
                <p className="text-foreground">{m.event}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus */}
      <section className="border-y bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-4">Campus Details</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            The university campus spans over 100 acres of lush greenery in the heart of Lucknow. 
            It features modern architecture, well-maintained gardens, and world-class infrastructure 
            designed to provide the best learning environment.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Building2 className="h-16 w-16 text-primary/40" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold">Main Academic Block</h3>
                <p className="text-sm text-muted-foreground">Houses multiple departments with modern classrooms</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <FlaskConical className="h-16 w-16 text-accent/40" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold">Research Center</h3>
                <p className="text-sm text-muted-foreground">Advanced research facilities for doctoral programs</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/5 flex items-center justify-center">
                <Dumbbell className="h-16 w-16 text-primary/40" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold">Sports Arena</h3>
                <p className="text-sm text-muted-foreground">Multi-sport complex with indoor and outdoor facilities</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-10">Facilities</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1">
                  <CardContent className="flex flex-col items-start gap-3 p-6">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
