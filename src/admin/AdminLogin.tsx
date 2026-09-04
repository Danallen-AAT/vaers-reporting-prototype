// ---------------------------------------------------------------------------
// MOCK admin login. Per the scope guardrails there is no real auth/user
// management in the prototype - this gate exists to demonstrate the workflow
// (a restricted program-owner surface) only. It accepts any input.
// ---------------------------------------------------------------------------
import { useState } from 'react';

export function AdminLogin({ onSignIn }: { onSignIn: (user: string) => void }) {
  const [user, setUser] = useState('cdc.program.owner');

  return (
    // English by decision, like the screen behind it, and marked so a Spanish
    // document does not claim it (WCAG 3.1.2).
    <main id="main" className="admin-login" lang="en" tabIndex={-1}>
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn(user.trim() || 'cdc.program.owner');
        }}
      >
        <p className="eyebrow">Admin · configuration surface</p>
        <h1>Sign in</h1>
        <p className="login-note" role="note">
          Demonstration only. No real authentication. Enter anything and continue.
          The production system would use CDC single sign-on / role-based access.
        </p>

        <label className="fe-row">
          <span className="fe-cap">Username</span>
          <input
            className="fe-input"
            name="username"
            autoComplete="off"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </label>
        <label className="fe-row">
          <span className="fe-cap">Password</span>
          <input
            className="fe-input"
            name="password"
            type="password"
            autoComplete="off"
            placeholder="(not checked)"
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Sign in to admin
          </button>
          <a className="btn btn-link" href="#/">
            Back to the form
          </a>
        </div>
      </form>
    </main>
  );
}
