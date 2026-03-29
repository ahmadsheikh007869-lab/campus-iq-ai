import { motion } from "framer-motion";
import { Info, Code2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <h1 className="text-4xl font-bold sm:text-5xl">About</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Learn more about this application and the team behind it.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> About This App
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <p>
                The Integral University Chatbot System is a comprehensive web application designed to provide 
                students, parents, and visitors with easy access to university information.
              </p>
              <p>
                Features include an AI-powered chatbot, detailed course and fee information, admission guidance, 
                library resources, and an admin dashboard for content management.
              </p>
              <p>
                Built with modern web technologies including React, Tailwind CSS, and Lovable Cloud for 
                a seamless and responsive experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" /> Developer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <p>
                This application was developed as a university information system with AI capabilities. 
                It demonstrates modern full-stack development using:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>React.js with TypeScript for the frontend</li>
                <li>Tailwind CSS for styling</li>
                <li>Lovable Cloud for backend (database, auth, edge functions)</li>
                <li>Lovable AI for the chatbot intelligence</li>
                <li>Framer Motion for animations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" /> Acknowledgements
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Special thanks to Integral University for inspiring this project and to the open-source 
                community for the amazing tools and libraries that made it possible.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
