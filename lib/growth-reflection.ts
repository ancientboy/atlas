export type GrowthSignalInput = {
  date: string;
  goal?: string | null;
  visits: number;
  signups: number;
  paid: number;
  impressions: number;
  clicks: number;
  conversions: number;
  attributedVisits: number;
  previous?: { visits: number; signups: number } | null;
};

export function buildGrowthReflection(input: GrowthSignalInput) {
  const visitDelta = input.visits - (input.previous?.visits ?? input.visits);
  const signupDelta = input.signups - (input.previous?.signups ?? input.signups);
  const ctr = input.impressions ? input.clicks / input.impressions : 0;
  const noMeasurement = input.visits === 0 && input.impressions === 0 && input.attributedVisits === 0;
  const summary = noMeasurement
    ? "Atlas has no connected growth signal yet, so today's plan focuses on measurement and one controlled distribution test."
    : input.conversions > 0
      ? "Published campaigns are producing measurable conversions. Atlas will reinforce the strongest proven message."
      : input.clicks > 0
        ? "Distribution is producing traffic but has not produced a recorded conversion yet."
        : input.impressions > 0
          ? "Content is receiving exposure but the message or CTA is not earning clicks yet."
          : "Product traffic is available, but campaign attribution is still incomplete.";
  const nextAction = noMeasurement
    ? "Connect analytics or publish one UTM-tracked campaign to establish a measurable baseline."
    : input.impressions > 0 && input.clicks === 0
      ? "Revise the highest-impression asset with a sharper pain-led opening and CTA."
      : input.clicks > 0 && input.conversions === 0
        ? "Review landing-page continuity and run one conversion-focused follow-up."
        : input.conversions > 0
          ? "Create a follow-up asset based on the best converting channel and message."
          : "Publish one approved campaign and collect another daily snapshot.";
  return {
    date: input.date,
    summary,
    goal: input.goal || "Establish repeatable product growth",
    signals: { visits: input.visits, signups: input.signups, paid: input.paid, impressions: input.impressions, clicks: input.clicks, conversions: input.conversions, attributedVisits: input.attributedVisits, visitDelta, signupDelta, ctr: Number((ctr * 100).toFixed(2)) },
    learnings: [noMeasurement ? "Measurement coverage is the current bottleneck." : input.clicks > 0 ? "At least one distribution message is earning attention." : "No validated distribution message is visible yet.", input.previous ? `Visits changed by ${visitDelta >= 0 ? "+" : ""}${visitDelta}; signups changed by ${signupDelta >= 0 ? "+" : ""}${signupDelta} since the previous snapshot.` : "This snapshot establishes the first daily baseline."],
    nextAction,
  };
}
