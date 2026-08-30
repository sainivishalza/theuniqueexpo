import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold">ExpoBridge</h3>
            <p className="mt-2 text-sm text-gray-500">
              Global B2B Exhibition, Trade &amp; Sourcing Platform
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Connecting buyers with exhibitors worldwide.
            </p>
          </div>

          {/* Exhibitions */}
          <div>
            <h4 className="text-sm font-semibold">Exhibitions</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-500">
              <li>
                <Link href="/exhibitions" className="hover:text-black">
                  Browse Exhibitions
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-black">
                  Exhibitor Directory
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-black">
                  Procurement Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-500">
              <li>
                <Link href="/register" className="hover:text-black">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-black">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-black">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-500">
              <li>📧 info@expobridge.com</li>
              <li>📞 +86 137 2521 5988</li>
              <li>📍 Guangzhou, China</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} ExpoBridge. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
