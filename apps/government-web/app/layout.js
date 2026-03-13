import "../styles/globals.css";
import SidebarNav from "../components/SidebarNav";
import TopNavbar from "../components/TopNavbar";

export const metadata = {
  title: "SurakshaNet Government Dashboard",
  description: "Monitoring and command interface for SurakshaNet incidents"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">
        <div className="min-h-screen">
          <TopNavbar />
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
            <SidebarNav />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}