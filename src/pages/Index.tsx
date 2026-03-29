import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, DollarSign, School, MessageCircle, Users, BookMarked, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const cards = [
  { icon: School, title: "University", desc: "History, campus & facilities", path: "/university", color: "bg-primary/10 text-primary" },
  { icon: BookOpen, title: "Library", desc: "Resources & digital access", path: "/library", color: "bg-accent/10 text-accent" },
  { icon: GraduationCap, title: "Admissions", desc: "Apply now & eligibility", path: "/admissions", color: "bg-primary/10 text-primary" },
  { icon: DollarSign, title: "Fees", desc: "Course-wise fee details", path: "/fees", color: "bg-accent/10 text-accent" },
  { icon: MessageCircle, title: "AI Chatbot", desc: "Ask me anything!", path: "#chatbot", color: "bg-primary/10 text-primary" },
];

const stats = [
  { icon: Users, value: "15,000+", label: "Students" },
  { icon: BookMarked, value: "100+", label: "Programs" },
  { icon: Trophy, value: "20+", label: "Years of Excellence" },
  { icon: GraduationCap, value: "50,000+", label: "Alumni" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              Est. 2004 — Lucknow, UP
            </span>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Integral University
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-2xl">
              A premier institution committed to academic excellence, holistic development, and shaping future leaders through innovation and research.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link to="/admissions">Apply Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/university">Explore Campus</Link>
              </Button>
            </div>
          </motion.div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
      </section>

      {/* Quick Nav Cards */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold mb-12"
          >
            Explore
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card, i) => (
              <motion.div
                key={card.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Link to={card.path}>
                  <Card className="group cursor-pointer border transition-all hover:shadow-md hover:-translate-y-1">
                    <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className={`rounded-xl p-3 ${card.color} transition-colors group-hover:bg-primary group-hover:text-primary-foreground`}>
                        <card.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">{card.title}</h3>
                      <p className="text-xs text-muted-foreground">{card.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col items-center gap-2 text-center"
              >
                <stat.icon className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of students who have built their careers at Integral University. Apply today!
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/admissions">Apply Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/fees">View Fees</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
