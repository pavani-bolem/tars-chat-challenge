import { Providers } from "@/components/providers";
import { SyncUser } from "@/components/sync-user";
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
          <SyncUser />
          {children}
        </Providers>
      </body>
    </html>
  );
}