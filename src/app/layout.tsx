import { Providers } from "@/components/providers";
import { SyncUser } from "@/components/sync-user";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {/* 🌟 Wrap everything in ThemeProvider */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SyncUser />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}