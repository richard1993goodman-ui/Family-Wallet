import { describe, expect, it } from "vitest";
import { defaultAgreementData, normalizeAgreement } from "./agreement.model";
import { effectiveWorkingDays } from "./work-hours";

describe("self-employed agreement data", () => {
  it("keeps the chosen document style and its own fields", () => {
    const data = normalizeAgreement({
      ...defaultAgreementData,
      documentStyle: "self_employed",
      servicesDescription: "After-school care",
      invoiceDays: "7",
      cancellationNotice: "48 hours",
      ownInsurance: "Public liability, £1m",
      allowSubstitute: false,
    });
    expect(data.documentStyle).toBe("self_employed");
    expect(data.servicesDescription).toBe("After-school care");
    expect(data.invoiceDays).toBe("7");
    expect(data.cancellationNotice).toBe("48 hours");
    expect(data.allowSubstitute).toBe(false);
  });

  it("falls back to the full contract for anything it does not recognise", () => {
    expect(normalizeAgreement({ documentStyle: "something else" }).documentStyle).toBe("full");
    expect(normalizeAgreement({}).documentStyle).toBe("full");
  });

  it("gives sensible self-employed defaults to older agreements", () => {
    const data = normalizeAgreement({ documentStyle: "full", employerName: "Sam" });
    expect(data.invoiceDays).toBe("14");
    expect(data.cancellationNotice).toBe("24 hours");
    expect(data.allowSubstitute).toBe(true);
  });

  it("its sessions fill in the calendar like any agreement's hours, split shifts included", () => {
    const days = [{ day: "Monday", enabled: true, startTime: "07:00", endTime: "09:00", startTime2: "15:00", endTime2: "19:00" }];
    const shown = effectiveWorkingDays(true, days as never, null, { hoursSource: "agreement" });
    expect(shown[0]?.startTime2).toBe("15:00");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelfEmployedDocument } from "../components/SelfEmployedDocument";

describe("self-employed document", () => {
  it("shows the sessions, fee and the status clause", () => {
    const html = renderToStaticMarkup(
      createElement(SelfEmployedDocument, {
        data: normalizeAgreement({
          documentStyle: "self_employed",
          employerName: "Sam Rivers",
          nannyName: "Jess Carter",
          hourlyRate: "18",
          invoiceDays: "14",
          workingDays: [{ day: "Monday", enabled: true, startTime: "07:00", endTime: "09:00", startTime2: "15:00", endTime2: "19:00" }],
        }),
      }),
    );
    expect(html).toContain("Services agreement for a self-employed nanny");
    expect(html).toContain("£18 per hour");
    expect(html).toContain("07:00 to 09:00 and 15:00 to 19:00");
    expect(html).toContain("independent self-employed person");
    expect(html).toContain("Sam Rivers");
  });
});
