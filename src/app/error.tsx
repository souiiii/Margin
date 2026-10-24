"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="boot-screen">
      <h1>Let’s reopen this page.</h1>
      <p>Your saved library is still here.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
