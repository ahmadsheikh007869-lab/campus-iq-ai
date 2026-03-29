import { motion } from "framer-motion";
import { BookOpen, Clock, Shield, Globe, Database, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const resources = [
  { icon: BookOpen, title: "Books & Textbooks", count: "100,000+", desc: "Comprehensive collection across all disciplines" },
  { icon: Newspaper, title: "Journals & Periodicals", count: "500+", desc: "National and international research journals" },
  { icon: Globe, title: "E-Resources", count: "24/7 Access", desc: "IEEE, Springer, Elsevier, JSTOR, and more" },
  { icon: Database, title: "Digital Library", count: "50,000+", desc: "E-books, theses, and dissertations" },
];

const rules = [
  "Valid university ID card is mandatory for entry",
  "Maintain silence inside the library premises",
  "Mobile phones must be on silent mode",
  "Food and beverages are not allowed",
  "Books must be returned within the due date",
  "Reference books are for in-library use only",
  "Maximum 4 books can be issued at a time",
  "Lost or damaged books must be replaced or compensated",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Library() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">Central Library</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The Central Library of Integral University is a hub of knowledge, providing students and faculty 
              with access to an extensive collection of books, journals, and digital resources.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Timing */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Library Timings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <span className="font-medium">Monday – Friday</span>
                  <span className="text-primary font-semibold">8:00 AM – 10:00 PM</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <span className="font-medium">Saturday</span>
                  <span className="text-primary font-semibold">9:00 AM – 5:00 PM</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <span className="font-medium">Sunday</span>
                  <span className="text-primary font-semibold">9:00 AM – 5:00 PM</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                  <span className="font-medium">Digital Resources</span>
                  <span className="text-primary font-semibold">24/7 Online</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Library Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="border-t bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold mb-10">Available Resources</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {resources.map((r, i) => (
              <motion.div key={r.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full text-center transition-all hover:shadow-md hover:-translate-y-1">
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <r.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-2xl font-bold text-primary">{r.count}</span>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
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
