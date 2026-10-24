"use client";
import { useState } from "react";
import { Check, ArrowRight, Lightbulb, RotateCcw } from "lucide-react";
import type { Exercise, PracticeSet, Attempt, Evaluation } from "@/lib/types";
import { useMargin } from "./context";
import { Button, Tag } from "./ui";
export function Feedback({ value }: { value: Evaluation }) {
  return (
    <div className={`feedback ${value.score >= 0.8 ? "positive" : "improve"}`}>
      <div className="feedback-title">
        {value.score >= 0.8 ? <Check size={18} /> : <Lightbulb size={18} />}
        <strong>
          {value.score >= 0.95
            ? "Well put."
            : value.score >= 0.8
              ? "You’ve got the idea."
              : value.score >= 0.5
                ? "Nearly there."
                : "Let’s work through it."}
        </strong>
      </div>
      <p>{value.feedback}</p>
      {value.improved_answer && (
        <div className="answer-example">
          <span>A natural answer</span>
          <p>{value.improved_answer}</p>
        </div>
      )}
      {value.evidence && <blockquote>{value.evidence}</blockquote>}
      {value.misconception && (
        <p className="learning-note">
          <RotateCcw size={14} />
          {value.misconception}
        </p>
      )}
    </div>
  );
}
export function ExerciseCard({
  exercise,
  set,
  index,
  inline = false,
}: {
  exercise: Exercise;
  set: PracticeSet;
  index: number;
  inline?: boolean;
}) {
  const { data, run, busy } = useMargin();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const attempt = data.attempts.find(
    (a) => a.set_id === set.id && a.exercise_id === exercise.id,
  );
  const value = attempt?.answer || answer;
  async function submit() {
    if (!answer.trim()) return;
    await run<Attempt>({
      action: "evaluate",
      setId: set.id,
      exerciseId: exercise.id,
      answer,
    });
  }
  return (
    <article className={`exercise-card ${inline ? "inline-exercise" : ""}`}>
      <div className="exercise-meta">
        <span>Question {index + 1}</span>
        <Tag>{exercise.type.replaceAll("-", " ")}</Tag>
      </div>
      <h3>{exercise.prompt}</h3>
      {exercise.type === "multiple-choice" ? (
        <fieldset className="answer-options" disabled={!!attempt || busy}>
          <legend className="sr-only">Choose your answer</legend>
          {exercise.options.map((option, i) => (
            <label
              className={`answer-option ${value === option ? "selected" : ""}`}
              key={option}
            >
              <input
                type="radio"
                name={`answer-${set.id}-${exercise.id}`}
                value={option}
                checked={value === option}
                onChange={() => setAnswer(option)}
              />
              <span className="option-key">{String.fromCharCode(65 + i)}</span>
              <span>{option}</span>
              {value === option && <Check size={16} />}
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="answer-field">
          <span className="sr-only">Your answer</span>
          <textarea
            aria-label="Your answer"
            rows={exercise.type === "writing" ? 6 : 3}
            placeholder={
              exercise.type === "writing"
                ? "Give it a little thought. Then write in your own words…"
                : "Your answer, in your own words…"
            }
            value={value}
            disabled={!!attempt || busy}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={8000}
          />
        </label>
      )}
      {attempt ? (
        <Feedback value={attempt.evaluation} />
      ) : (
        <div className="exercise-actions">
          <Button disabled={!answer.trim() || busy} onClick={submit}>
            Check answer <ArrowRight size={15} />
          </Button>
          <button
            className="text-button muted"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? "Hide explanation" : "Show explanation"}
          </button>
        </div>
      )}
      {revealed && !attempt && (
        <div className="revealed-answer">
          <span className="quiet-label">Explanation</span>
          <p>{exercise.answer}</p>
          <p>{exercise.explanation}</p>
          {exercise.evidence && <blockquote>{exercise.evidence}</blockquote>}
          <small>
            Try expressing the answer in your own words before checking it.
          </small>
        </div>
      )}
    </article>
  );
}
