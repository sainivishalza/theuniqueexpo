import Logo from "@/components/Logo";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Browse Exhibitions", href: "/exhibitions" },
    { label: "Our Services", href: "/services" },
    { label: "Business Tours", href: "/services/business-tours" },
    { label: "China Tours", href: "/services/china-tours" },
    { label: "Exhibitor Directory", href: "/directory" },
    { label: "RFQ Marketplace", href: "/marketplace" },
    { label: "Partner Program", href: "/register" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Resources: [
    { label: "Help Center", href: "#" },
    { label: "Exhibition Guide", href: "#" },
    { label: "Booth Setup Tips", href: "#" },
    { label: "API Documentation", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white">Stay Updated</h3>
            <p className="text-sm text-gray-400 mt-1">Get the latest exhibition news and exclusive early-bird offers.</p>
          </div>
          <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 md:w-72 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
            />
            <button className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <Logo size="default" />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            The global B2B exhibition, trade-fair &amp; sourcing platform connecting buyers
            with exhibitors worldwide.
          </p>
          {/* Social icons */}
          <div className="flex gap-3 mt-5">
            {["X", "in", "f", "▶"].map((icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-sm font-bold text-white mb-4">{title}</h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} The Unique Expo. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
