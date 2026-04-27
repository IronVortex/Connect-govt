import '../styles/globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Connect - Your Gateway to Government Services',
  description: 'Simplify your government document verification process.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-background text-foreground">
          {children}
        </div>
      </body>
    </html>
  );
}
