import './globals.css';

export const metadata = {
  title: 'SmartQR — Restaurant Ordering',
  description: 'Real-time QR-based restaurant ordering system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
