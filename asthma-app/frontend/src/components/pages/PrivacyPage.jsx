import { Link } from "react-router";
import { urls } from "../../constants";
import "./PrivacyPage.css";

const LAST_UPDATED = "August 4, 2026";
const CONTACT_EMAIL = "support@lobelia.app";

function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <p className="privacy-brand">Lobelia</p>
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: {LAST_UPDATED}</p>
        <p className="privacy-intro">
          This Privacy Policy describes how Lobelia (“we,” “us,” or “our”)
          collects, uses, and shares information when you use our website and
          related services. Lobelia provides educational asthma risk forecasts
          and tips. It is not a medical device and does not diagnose, treat, or
          prescribe.
        </p>
      </header>

      <section>
        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> email address, password
            (stored in hashed form), and optional profile details such as name,
            profile photo URL, date of birth, emergency contacts, preferences,
            triggers, and care goals.
          </li>
          <li>
            <strong>Health logs you provide:</strong> daily symptom check-ins,
            activity limitation, notes, triggers, and rescue-inhaler use.
          </li>
          <li>
            <strong>Optional wearable summaries:</strong> sleep, steps,
            activity, and heart-rate summaries you sync or log.
          </li>
          <li>
            <strong>Location (when permitted):</strong> approximate latitude and
            longitude used to fetch weather, air quality, and pollen for your
            forecast.
          </li>
          <li>
            <strong>Google Calendar (optional):</strong> if you connect Google
            Calendar, we store a refresh token and your Google account email,
            and we read calendar event details (such as title, time, location,
            and description) to personalize tips.
          </li>
          <li>
            <strong>AI feature inputs:</strong> messages you send in chat, plus
            context needed to respond (for example forecast, symptoms, calendar,
            environment, and similar past days).
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <ul>
          <li>Create and sign in to your account.</li>
          <li>
            Send verification and password-reset emails with short-lived codes.
          </li>
          <li>
            Run risk predictions and show personalized educational advice (such
            as the Home “Next Step”).
          </li>
          <li>
            Personalize tips using your logs, environment data, and (if
            connected) planned activities.
          </li>
          <li>
            Remember similar past days (summaries and embeddings) so advice can
            reflect your history.
          </li>
          <li>Operate, secure, and improve the service.</li>
        </ul>
      </section>

      <section>
        <h2>3. AI and third-party services</h2>
        <p>
          We use third-party providers to operate Lobelia. Depending on
          configuration, these may include:
        </p>
        <ul>
          <li>
            <strong>Resend</strong> — authentication emails containing
            verification codes.
          </li>
          <li>
            <strong>Google Gemini and/or Anthropic Claude</strong> — generating
            advice and chat replies; embeddings for personal history retrieval.
          </li>
          <li>
            <strong>Open-Meteo and/or OpenWeather / Google Pollen</strong> —
            weather, air quality, and pollen based on your location.
          </li>
          <li>
            <strong>Google</strong> — Calendar OAuth (read-only) and Calendar
            API.
          </li>
          <li>
            <strong>Hosting and infrastructure</strong> — for example Google
            Cloud Run (API), a hosted Postgres database, Vercel (web app), and
            Cloudinary (profile photos).
          </li>
        </ul>
        <p>
          Calendar event details and health-related context may be sent to AI
          providers solely to generate your advice or chat reply. We do not sell
          your personal information.
        </p>
      </section>

      <section>
        <h2>4. What we store</h2>
        <ul>
          <li>
            <strong>Stored:</strong> account data, check-ins, inhaler events,
            wearable summaries, forecasts and advice, environment snapshots,
            calendar connection credentials, and derived episode memory used for
            personalization.
          </li>
          <li>
            <strong>Chat:</strong> one-off Copilot chat messages are processed to
            generate a reply and are not kept as a conversation history log in
            our database. Personalization comes from check-ins, forecasts,
            calendar, and episode memory instead.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Google Calendar</h2>
        <p>
          If you choose to connect Google Calendar, Lobelia requests{" "}
          <strong>read-only</strong> access
          (<code>https://www.googleapis.com/auth/calendar.readonly</code>). You
          can disconnect Calendar in the app, which removes the stored Google
          token and email. Event details already saved into past forecasts or
          check-ins may remain until overwritten by newer data.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>
          We keep account and logged health/forecast data while your account is
          active. Authentication email codes expire quickly (about 10 minutes).
          Self-serve full account deletion is not currently available in the
          app; contact us to request deletion.
        </p>
      </section>

      <section>
        <h2>7. Your choices</h2>
        <ul>
          <li>Use Lobelia without connecting Google Calendar.</li>
          <li>
            Deny browser location access (forecasts may use a fallback
            location).
          </li>
          <li>Disconnect Google Calendar at any time in the app.</li>
          <li>Update your profile and overwrite today’s check-in.</li>
          <li>
            Contact us for access or deletion requests at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Passwords are hashed. Access uses login tokens. Data is stored in
          hosted cloud infrastructure used to operate the service. No method of
          transmission or storage is completely secure.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Lobelia is not directed at children under 13 (or under 16 where
          required by law). We do not knowingly collect personal information
          from children.
        </p>
      </section>

      <section>
        <h2>10. Medical disclaimer</h2>
        <p>
          Content in Lobelia is for educational purposes only and is not a
          substitute for your clinician or asthma action plan. If you
          experience a medical emergency, seek emergency care immediately.
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. The “Last
          updated” date will change when we do. Material changes may be noted
          in the app or by email.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about this policy:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <footer className="privacy-footer">
        <Link to={urls.landing}>Back to Lobelia</Link>
      </footer>
    </main>
  );
}

export default PrivacyPage;
