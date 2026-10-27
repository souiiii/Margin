"use client";
import { useMargin } from "./context";
import { Empty, Button, Tag, PageHeader } from "./ui";
import { ArrowRight, TrendingUp, RotateCcw, BookOpen } from "lucide-react";
import { localDate } from "@/lib/client";
import type { Skill } from "@/lib/types";
export function Progress() {
  const { data, navigate } = useMargin();
  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 27 + i);
    const day = localDate(date);
    const attempts = data.attempts.filter(
      (a) => localDate(new Date(a.created_at)) === day,
    ).length;
    const reviews = data.reviews.filter(
      (a) => localDate(new Date(a.created_at)) === day,
    ).length;
    return { day, date, count: attempts + reviews };
  });
  const recognition = data.reviewStates.filter(
      (s) => s.mode === "recognition" && s.interval_days >= 7,
    ).length,
    production = data.reviewStates.filter(
      (s) => s.mode === "production" && s.interval_days >= 7,
    ).length;
  const skills: Skill[] = [
    "vocabulary",
    "grammar",
    "comprehension",
    "writing",
    "word-choice",
  ];
  const mistakes = data.attempts
    .filter((a) => a.evaluation.score < 0.8 && a.evaluation.misconception)
    .slice(0, 8);
  return (
    <div className="page progress-page">
      <PageHeader
        index="05"
        label="A record of your work"
        title="Your English, unfolding"
        description="Small, steady steps. A clearer picture of what you’re learning."
      />
      {!data.attempts.length && !data.reviews.length ? (
        <Empty
          symbol={<TrendingUp size={30} />}
          title="Progress starts with practice."
          action={
            <Button onClick={() => navigate("practice")}>
              Find a little practice <ArrowRight size={16} />
            </Button>
          }
        >
          As you read, recall, and write, you’ll see what’s becoming familiar
          and what needs another look.
        </Empty>
      ) : (
        <>
          <section className="activity-section">
            <div className="section-title">
              <h2>The last four weeks</h2>
              <span className="quiet-label">Practice & reviews</span>
            </div>
            <div className="activity-days">
              {days.map((d) => (
                <div
                  key={d.day}
                  className={`activity-day level-${Math.min(3, Math.ceil(d.count / 4))}`}
                  title={`${d.date.toLocaleDateString()}: ${d.count} answers and reviews`}
                >
                  <span className="activity-count" aria-hidden="true">
                    {d.count || "·"}
                  </span>
                  <span className="sr-only">
                    {d.day}: {d.count} answers and reviews
                  </span>
                </div>
              ))}
            </div>
            <div className="activity-labels">
              <span>
                {days[0].date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>Today</span>
            </div>
          </section>
          <section className="retention-insight">
            <h2>
              Knowing it. <span className="display-muted">Owning it.</span>
            </h2>
            <p>
              A meaning you recognise and an expression you use are two
              different kinds of progress.
            </p>
            <div className="retention-comparison">
              <div>
                <strong>
                  {recognition}
                  <span> / {data.items.length}</span>
                </strong>
                <h3>Recognised</h3>
                <p>Recall holding for a week or longer.</p>
              </div>
              <div>
                <strong>
                  {production}
                  <span> / {data.items.length}</span>
                </strong>
                <h3>Used naturally</h3>
                <p>Successful sentence use, holding for a week or longer.</p>
              </div>
            </div>
            <small>
              These counts use review intervals of at least 7 days. They’re
              evidence of practice, not a fluency score.
            </small>
          </section>
          <section className="skills-section">
            <h2>What you’re working on</h2>
            <div className="skills-table">
              {skills.map((skill) => {
                const attempts = data.attempts.filter((a) => a.skill === skill);
                const average = attempts.length
                  ? attempts.reduce((s, a) => s + a.evaluation.score, 0) /
                    attempts.length
                  : 0;
                return (
                  <div className="skill-row" key={skill}>
                    <span>
                      {skill === "word-choice"
                        ? "Word choice"
                        : skill[0].toUpperCase() + skill.slice(1)}
                    </span>
                    <div className="skill-track">
                      <span style={{ width: `${average * 100}%` }} />
                    </div>
                    <span>
                      {attempts.length
                        ? `${Math.round(average * 100)}% · ${attempts.length} ${attempts.length === 1 ? "answer" : "answers"}`
                        : "Not practised yet"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="quiet-label">
              Average answer quality across completed questions. Small samples
              are only a starting point.
            </p>
          </section>
          {mistakes.length > 0 && (
            <section className="mistakes-section">
              <div className="section-title">
                <h2>Worth working through</h2>
                <RotateCcw size={18} />
              </div>
              {mistakes.map((m) => (
                <button
                  key={m.id}
                  className="mistake-row"
                  onClick={() => {
                    const set = data.sets.find((s) => s.id === m.set_id);
                    navigate(
                      set?.source_article_id ? "readings" : "practice",
                      set?.source_article_id
                        ? { article: set.source_article_id }
                        : { set: m.set_id },
                    );
                  }}
                >
                  <div>
                    <Tag>{m.skill.replace("-", " ")}</Tag>
                    <p>{m.evaluation.misconception}</p>
                  </div>
                  <ArrowRight size={17} />
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
