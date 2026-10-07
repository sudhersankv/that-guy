export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  return <div className="page-paper relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip pb-8 text-ink">{children}</div>;
}
