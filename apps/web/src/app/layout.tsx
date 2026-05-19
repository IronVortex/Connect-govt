import { AuthProvider } from "../lib/AuthContext";
import "./global.css";

export const metadata = {
  title: "Connect - Gateway to Government Services",
  description: "Secure and simplified access to all government workflows and services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
