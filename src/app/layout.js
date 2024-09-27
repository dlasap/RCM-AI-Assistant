import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Reliability Management Bot",
  description: "Generated by Reliability Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased relative`}>
        {children}

        <div className="absolute bottom-[0%] left-[10px]">
          <p className="text-2xl font-bold ">
            <span className="text-orange-400">Reliability</span> Management
          </p>
        </div>
      </body>
    </html>
  );
}
