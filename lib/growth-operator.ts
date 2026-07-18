export type GrowthOperatorObservation = {
  sourceType: string;
  sourceName: string;
  content: string;
  observedAt: string;
};

export type GrowthOperatorOpportunity = {
  title: string;
  summary: string;
  suggestedAction: string;
  confidence: number;
  signal: string;
  source: string;
};

export type GrowthOperatorAction = {
  title: string;
  why: string;
  expectedOutcome: string;
  evidence: string[];
  priority: number;
  riskLevel: 1 | 2;
};

export type GrowthOperatorBrief = {
  summary: string;
  yesterday: string[];
  discoveries: { title: string; detail: string; source: string; confidence: number }[];
  today: GrowthOperatorAction[];
  nextAction: string;
  risk: string;
};

export type GrowthOperatorPlan = {
  date: string;
  stage: "measure" | "acquire" | "convert" | "scale";
  goal: string;
  confidence: number;
  priorityScore: number;
  expectedImpact: string;
  evidence: string[];
  localized: { en: GrowthOperatorBrief; zh: GrowthOperatorBrief };
};

export type GrowthOperatorInput = {
  date: string;
  productName: string;
  goal?: string | null;
  visits: number;
  signups: number;
  paid: number;
  impressions: number;
  clicks: number;
  conversions: number;
  attributedVisits: number;
  previous?: { visits: number; signups: number; paid?: number; attributedVisits?: number } | null;
  completedYesterday: string[];
  pendingApprovals: number;
  analyticsConnected: boolean;
  observations: GrowthOperatorObservation[];
  opportunities: GrowthOperatorOpportunity[];
};

function metricEvidence(input: GrowthOperatorInput) {
  const ctr = input.impressions ? Number(((input.clicks / input.impressions) * 100).toFixed(1)) : 0;
  const visitDelta = input.visits - (input.previous?.visits ?? input.visits);
  const signupDelta = input.signups - (input.previous?.signups ?? input.signups);
  return {
    ctr,
    visitDelta,
    signupDelta,
    en: `${input.visits} visits (${visitDelta >= 0 ? "+" : ""}${visitDelta}), ${input.signups} signups (${signupDelta >= 0 ? "+" : ""}${signupDelta}), ${input.impressions} impressions, ${input.clicks} clicks and ${input.conversions} attributed conversions.`,
    zh: `${input.visits} 次访问（${visitDelta >= 0 ? "+" : ""}${visitDelta}）、${input.signups} 个注册（${signupDelta >= 0 ? "+" : ""}${signupDelta}）、${input.impressions} 次曝光、${input.clicks} 次点击、${input.conversions} 个归因转化。`,
  };
}

function sourceDiscoveries(input: GrowthOperatorInput) {
  const topOpportunities = [...input.opportunities].sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  const discoveries = topOpportunities.map((item) => ({ title: item.title, detail: item.summary, source: item.source, confidence: item.confidence }));
  if (discoveries.length < 2 && input.observations[0]) {
    const observation = input.observations[0];
    discoveries.push({ title: observation.content.slice(0, 160), detail: observation.content, source: observation.sourceName, confidence: 65 });
  }
  return discoveries;
}

export function buildGrowthOperatorPlan(input: GrowthOperatorInput): GrowthOperatorPlan {
  const metric = metricEvidence(input);
  const hasMeasurement = input.analyticsConnected || input.visits > 0 || input.impressions > 0 || input.attributedVisits > 0;
  const stage: GrowthOperatorPlan["stage"] = !hasMeasurement
    ? "measure"
    : input.conversions > 0 || input.paid > (input.previous?.paid ?? input.paid)
      ? "scale"
      : input.clicks > 0 || (input.visits > 0 && input.signups === 0)
        ? "convert"
        : "acquire";
  const opportunity = [...input.opportunities].sort((a, b) => b.confidence - a.confidence)[0];
  const goal = input.goal?.trim() || "Establish repeatable product growth";
  const evidence = [metric.en];
  if (opportunity) evidence.push(`${opportunity.signal}: ${opportunity.title} (${opportunity.confidence}% confidence)`);
  if (input.observations[0]) evidence.push(`${input.observations[0].sourceName}: ${input.observations[0].content.slice(0, 180)}`);

  const primary = {
    measure: {
      en: { title: "Establish a trustworthy measurement baseline", why: "Atlas cannot learn from distribution until visits and conversions are attributable.", outcome: "One verified baseline and a UTM-tracked acquisition test." },
      zh: { title: "先建立可信的增长数据基线", why: "在访问和转化可归因之前，Atlas 无法从推广结果中持续学习。", outcome: "获得一份可验证基线，并完成一次带 UTM 的获客测试。" },
    },
    acquire: {
      en: { title: opportunity?.suggestedAction || "Publish one focused acquisition experiment", why: opportunity ? `This is the highest-confidence open opportunity (${opportunity.confidence}%).` : "Reach is the current bottleneck and no validated distribution test is active.", outcome: "Create measurable qualified traffic and learn which message earns attention." },
      zh: { title: opportunity?.suggestedAction || "发布一个聚焦的获客实验", why: opportunity ? `这是当前置信度最高的增长机会（${opportunity.confidence}%）。` : "当前瓶颈是触达，尚无经过验证的分发实验。", outcome: "获得可衡量的目标流量，并验证哪种信息能够赢得关注。" },
    },
    convert: {
      en: { title: "Align the landing page with the message earning clicks", why: "Distribution is earning attention, but recorded conversion is weak or missing.", outcome: "Improve visit-to-signup continuity with one controlled conversion test." },
      zh: { title: "让落地页承接当前能带来点击的信息", why: "推广已经获得关注，但转化仍然不足或尚未被记录。", outcome: "通过一次受控转化实验改善访问到注册的连续性。" },
    },
    scale: {
      en: { title: "Repeat the best converting message in one adjacent channel", why: "At least one campaign has produced a measurable conversion signal.", outcome: "Test whether the winning message can produce repeatable conversions." },
      zh: { title: "把转化最好的信息复制到一个相邻渠道", why: "至少一个 Campaign 已经产生了可衡量的转化信号。", outcome: "验证当前有效信息是否能够带来可重复转化。" },
    },
  }[stage];

  const makeActions = (locale: "en" | "zh"): GrowthOperatorAction[] => {
    const copy = primary[locale];
    const items: GrowthOperatorAction[] = [{ title: copy.title, why: copy.why, expectedOutcome: copy.outcome, evidence: locale === "zh" ? [metric.zh, ...evidence.slice(1)] : evidence, priority: 1, riskLevel: 1 }];
    if (input.pendingApprovals > 0) items.push({
      title: locale === "zh" ? `处理 ${input.pendingApprovals} 项待审批行动` : `Review ${input.pendingApprovals} pending action${input.pendingApprovals === 1 ? "" : "s"}`,
      why: locale === "zh" ? "已准备的工作只有在批准后才能进入发布与衡量。" : "Prepared work cannot move into publishing and measurement until it is approved.",
      expectedOutcome: locale === "zh" ? "明确批准、修改或拒绝，清理执行阻塞。" : "Approve, revise, or reject each item and remove execution blockers.",
      evidence: [locale === "zh" ? `${input.pendingApprovals} 项操作正在等待审批。` : `${input.pendingApprovals} actions are waiting for approval.`],
      priority: 2,
      riskLevel: 2,
    });
    if (opportunity && items[0].title !== opportunity.suggestedAction) items.push({
      title: locale === "zh" ? `验证机会：${opportunity.title}` : `Validate opportunity: ${opportunity.title}`,
      why: locale === "zh" ? "机会有明确来源，但在投入执行前仍需一次小规模验证。" : "The opportunity has a traceable source but still needs a small test before larger execution.",
      expectedOutcome: locale === "zh" ? "获得继续、调整或停止的证据。" : "Collect evidence to continue, adjust, or stop.",
      evidence: [`${opportunity.source} · ${opportunity.confidence}%`],
      priority: items.length + 1,
      riskLevel: 1,
    });
    return items.slice(0, 3);
  };

  const discoveries = sourceDiscoveries(input);
  const yesterdayEn = input.completedYesterday.length ? input.completedYesterday : ["No completed Agent task was recorded yesterday."];
  const yesterdayZh = input.completedYesterday.length ? input.completedYesterday : ["昨天没有记录到已完成的 Agent 任务。"];
  const summaryByStage = {
    measure: { en: "Measurement is the current operating bottleneck. Atlas will establish a baseline before making stronger growth claims.", zh: "当前运营瓶颈是数据衡量。Atlas 会先建立基线，再做更强的增长判断。" },
    acquire: { en: "Atlas found an acquisition bottleneck and selected the strongest available distribution signal for a controlled test.", zh: "Atlas 发现当前瓶颈在获客，并选择了最强的分发信号进行受控测试。" },
    convert: { en: "Attention exists, but conversion continuity is weak. Today's plan focuses on the message-to-landing-page handoff.", zh: "已经获得了一定关注，但转化连续性较弱。今天重点优化信息与落地页的承接。" },
    scale: { en: "A measurable conversion signal exists. Atlas will test whether the winning message is repeatable before scaling further.", zh: "已经出现可衡量的转化信号。Atlas 会先验证有效信息是否可重复，再继续放大。" },
  }[stage];
  const risk = {
    en: input.pendingApprovals > 0 ? "External actions remain blocked until you approve them." : "No high-risk automatic external action is planned.",
    zh: input.pendingApprovals > 0 ? "外部操作仍需你批准后才能继续。" : "今天没有计划高风险的自动外部操作。",
  };
  const confidence = Math.min(95, Math.round(52 + (hasMeasurement ? 12 : 0) + Math.min(16, input.observations.length * 2) + (opportunity ? opportunity.confidence * 0.15 : 0)));
  const priorityScore = Math.min(100, Math.round(70 + (stage === "convert" ? 10 : stage === "measure" ? 8 : 5) + (opportunity ? opportunity.confidence * 0.12 : 0)));
  const enActions = makeActions("en");
  const zhActions = makeActions("zh");

  return {
    date: input.date,
    stage,
    goal,
    confidence,
    priorityScore,
    expectedImpact: primary.en.outcome,
    evidence,
    localized: {
      en: { summary: summaryByStage.en, yesterday: [metric.en, ...yesterdayEn].slice(0, 4), discoveries, today: enActions, nextAction: enActions[0].title, risk: risk.en },
      zh: { summary: summaryByStage.zh, yesterday: [metric.zh, ...yesterdayZh].slice(0, 4), discoveries, today: zhActions, nextAction: zhActions[0].title, risk: risk.zh },
    },
  };
}
