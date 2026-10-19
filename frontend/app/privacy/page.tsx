import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Yaadon ki Baithak collects, why, who processes it, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const REPO = "https://github.com/CodeVoyager007/Yaadon-Ki-Baithak";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" ur="رازداری کی پالیسی" updated="19 October 2026">
      <p>
        Yaadon ki Baithak helps families record their elders&apos; stories and turn them into illustrated storybooks.
        These stories are personal, so we collect as little as we can and keep each family&apos;s book private to them.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address, or your Google account&apos;s name, email and
          profile picture if you sign in with Google. We never see your Google password.
        </li>
        <li>
          <strong>Your family book:</strong> the family name, each storyteller&apos;s name, relation, language and, if you
          add them, birthplace, birth year and a small photo.
        </li>
        <li>
          <strong>Recordings:</strong> the elder&apos;s voice recordings, including the spoken consent recorded before
          anything is saved, and their transcripts.
        </li>
        <li>
          <strong>Storybooks:</strong> the stories written from those recordings and the paintings made for each page.
        </li>
      </ul>
      <p>We do not use advertising, tracking cookies or analytics, and we do not sell or rent any data.</p>

      <h2>How we use it</h2>
      <p>
        Only to run the app for you: to transcribe the recordings, ask clarifying questions, write and paint the
        storybook, keep it on your family bookshelf, and bring it back when you sign in on another device.
      </p>

      <h2>Who processes it</h2>
      <p>To do this, your data passes through these services, each under its own privacy terms:</p>
      <ul>
        <li><strong>Supabase:</strong> sign-in, the database and private storage for recordings and paintings.</li>
        <li><strong>Google Gemini API:</strong> transcription, Hudhud&apos;s questions and voice, and writing the story.</li>
        <li>
          <strong>Cloudflare Workers AI:</strong> the paintings (it receives only a short scene description, never the
          recordings, the elder&apos;s words or photo) and a backup transcriber.
        </li>
        <li><strong>Vercel and Render:</strong> hosting for the website and the AI service.</li>
      </ul>
      <p>
        The app sends data to these services only to produce your storybook. We do not ask them to use it for anything
        else, but their own terms govern how they handle requests.
      </p>

      <h2>Who can see your book</h2>
      <p>
        Only you. Every record is tied to your account and protected by row level security, and recordings and paintings
        are served through short-lived private links. If you create a share link, anyone with that link can read the
        storybook (but not change it). You can stop sharing by deleting the storybook.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>The elder agrees on the record before anything is saved; you can stop a recording at any time.</li>
        <li>Deleting a storybook removes its story, recordings and paintings from the app and from our storage.</li>
        <li>
          To delete your whole account and everything in it, or to ask what we hold about you, open a request at{" "}
          <Link href={`${REPO}/issues`}>our GitHub page</Link>. We will act on it within 30 days.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        Accounts are for adults (the family member keeping the book). Elders and children may appear in stories, but
        only an adult account holder decides what is recorded and kept.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we will update this page and the date above. Questions? Reach the team at{" "}
        <Link href={`${REPO}/issues`}>github.com/CodeVoyager007/Yaadon-Ki-Baithak</Link>.
      </p>
    </LegalPage>
  );
}
