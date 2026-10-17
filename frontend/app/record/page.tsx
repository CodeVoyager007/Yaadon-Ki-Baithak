import { Suspense } from "react";
import { RecordRoom } from "./RecordRoom";

export const metadata = { title: "Record a story" };

export default function RecordPage() {
  return (
    <Suspense>
      <RecordRoom />
    </Suspense>
  );
}
