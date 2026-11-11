import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reviewLabel } from "./agreement-review";

describe("agreement review label", () => {
  it("says not yet reviewed when there is no template", () => {
    expect(reviewLabel(null)).toMatchObject({ approved: false, text: expect.stringContaining("Not yet legally reviewed") });
  });

  it.each(["draft", "under_review", "superseded"] as const)("never says reviewed for a %s template", (status) => {
    expect(reviewLabel({ status, reviewerName: "A Solicitor", reviewedAt: "2026-11-01" }).approved).toBe(false);
  });

  it("does not say reviewed without a named reviewer and a date, even if marked approved", () => {
    expect(reviewLabel({ status: "approved", reviewerName: "", reviewedAt: "2026-11-01" }).approved).toBe(false);
    expect(reviewLabel({ status: "approved", reviewerName: "A Solicitor", reviewedAt: null }).approved).toBe(false);
  });

  it("names the reviewer and date once approved properly", () => {
    const label = reviewLabel({ status: "approved", reviewerName: "A Solicitor", reviewedAt: "2026-11-01" });
    expect(label.approved).toBe(true);
    expect(label.text).toContain("A Solicitor");
    expect(label.text).toContain("1 November 2026");
  });
});

describe("template tables", () => {
  const sql = readFileSync("supabase/migrations/20261111440000_agreement_templates.sql", "utf8");
  it("cannot be approved without a named reviewer and a date", () => {
    expect(sql).toMatch(/check \(status <> 'approved' or \(reviewer_name is not null and reviewed_at is not null\)\)/);
  });
  it("freezes an approved version and only allows it to be superseded", () => {
    expect(sql).toMatch(/An approved agreement template version cannot be edited/);
  });
  it("ships no seeded template wording", () => {
    expect(sql).not.toMatch(/insert into public\.agreement_templates/i);
    expect(sql).not.toMatch(/insert into public\.agreement_template_versions/i);
  });
});
