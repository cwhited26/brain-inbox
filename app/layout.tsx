export const metadata = { title: "Brain Inbox", robots: { index: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
