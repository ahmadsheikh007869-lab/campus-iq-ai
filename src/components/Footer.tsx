import { Link } from "react-router-dom";
import iuLogo from "@/assets/iu-logo.png";

export default function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={iuLogo} alt="Integral University Logo" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-bold">Integral University</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Established in 2004, Integral University is a premier institution in Lucknow, UP, offering quality education across diverse disciplines.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/university" className="hover:text-primary transition-colors">University</Link>
              <Link to="/library" className="hover:text-primary transition-colors">Library</Link>
              <Link to="/admissions" className="hover:text-primary transition-colors">Admissions</Link>
              <Link to="/fees" className="hover:text-primary transition-colors">Fees</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Kursi Road, Lucknow</p>
              <p>Uttar Pradesh - 226026</p>
              <p>info@iul.ac.in</p>
              <p>+91-522-2890812</p>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Resources</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About App</Link>
              <Link to="/admin" className="hover:text-primary transition-colors">Admin Panel</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Integral University. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
