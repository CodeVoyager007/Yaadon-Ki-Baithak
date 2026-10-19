import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Yaadon ki Baithak.",
  alternates: { canonical: "/terms" },
};

const REPO = "https://github.com/CodeVoyager007/Yaadon-Ki-Baithak";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" ur="شرائطِ استعمال" updated="19 October 2026">
      <p>
        Yaadon ki Baithak is a free project built for the NYLP AI Hackathon 2026. By using it you agree to these terms.
        Please also read our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Using the app</h2>
      <ul>
        <li>You must be an adult to create an account, and you are responsible for keeping your sign-in safe.</li>
        <li>
          Only record people who have agreed to it. The app asks the elder for spoken consent before saving anything;
          please respect their answer, and stop if they ask.
        </li>
        <li>
          Don&apos;t use the app to record anyone without their knowledge, or to upload anything illegal, hateful or that
          you don&apos;t have the right to share.
        </li>
      </ul>

      <h2>Your stories stay yours</h2>
      <p>
        The recordings, stories and storybooks you create belong to you and your family. You give us permission only to
        store and process them as needed to run the app for you (see the privacy policy). You can delete any storybook
        at any time.
      </p>

      <h2>About the AI</h2>
      <p>
        Transcripts, questions, stories and paintings are made by AI models. They are instructed to use only what the
        elder said, and the app checks quotes and years against the recordings, but AI can still make mistakes. Please
        read each storybook before sharing it, and use the edit button to correct anything. Paintings are illustrations,
        not historical records.
      </p>

      <h2>Availability</h2>
      <p>
        The app is provided as is, free of charge, without warranties. It relies on free services with daily limits, so
        some features may be slow or unavailable at times, and it may change or stop. Keep a copy of storybooks that
        matter to you: you can download any of them as a PDF.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, the team behind Yaadon ki Baithak is not liable for any loss arising from using the
        app, including lost recordings or storybooks.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions? Reach the team at{" "}
        <Link href={`${REPO}/issues`}>github.com/CodeVoyager007/Yaadon-Ki-Baithak</Link>.
      </p>
    </LegalPage>
  );
}
