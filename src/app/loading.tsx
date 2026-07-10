import { Spinner } from "@/components/feedback/page-loader";

export default function RootLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <Spinner className="h-6 w-6 text-primary" />
    </div>
  );
}
