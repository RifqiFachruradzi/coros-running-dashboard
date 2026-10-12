import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "STRIDE+ — Running dashboard",
  description: "Progress latihan lari, ditarik otomatis dari COROS.",
  applicationName: "STRIDE+",
  // Installed on an iPhone home screen: full screen, title under the icon,
  // and the status bar drawn over the black page (safe-area padding in
  // globals.css keeps content below it).
  appleWebApp: {
    capable: true,
    title: "STRIDE+",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  // Lets the page extend under the notch and home indicator; env(safe-area-*)
  // insets then keep content and the bottom menu clear of them.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={poppins.variable}>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
