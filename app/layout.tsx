import './globals.css';

export const metadata = {
  title: 'Prompt to Cartoon',
  description: 'Turn a story idea into a narrated cartoon.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
