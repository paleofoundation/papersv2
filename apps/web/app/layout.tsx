import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DOCX Style Family Compositor',
  description: 'Infer document style families and generate styled documents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        {children}
      </body>
    </html>
  );
}
