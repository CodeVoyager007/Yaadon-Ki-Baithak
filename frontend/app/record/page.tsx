import { Suspense } from "react";
import { RecordRoom } from "./RecordRoom";

export const metadata = { title: "Record a story", robots: { index: false, follow: false } };

export default function RecordPage() {
  return (
    <Suspense>
      <RecordRoom />
    </Suspense>
  );
}
