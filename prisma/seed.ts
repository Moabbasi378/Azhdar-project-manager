import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DAY = 86_400_000;
const now = Date.now();
const daysFromNow = (d: number) => new Date(now + d * DAY);
const hoursAgo = (h: number) => new Date(now - h * 3_600_000);

let orderCounter = 0;
function nextOrder() {
  return `a${String(orderCounter++).padStart(4, "0")}`;
}

async function main() {
  console.log("🌱 پاک‌سازی داده‌های قبلی…");
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedFilter.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issueLabel.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.label.deleteMany();
  await prisma.projectStatus.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  console.log("👤 ساخت کاربران…");
  const [owner, pm, dev1, dev2, dev3, dev4, dev5, viewer] = await Promise.all(
    (
      [
        ["سارا", "احمدی", "owner@agile.dev", "OWNER", "#6366f1"],
        ["محمد", "رضایی", "pm@agile.dev", "PROJECT_MANAGER", "#8b5cf6"],
        ["علی", "کریمی", "ali@agile.dev", "DEVELOPER", "#ec4899"],
        ["رضا", "موسوی", "reza@agile.dev", "DEVELOPER", "#f97316"],
        ["مهدی", "نوری", "mehdi@agile.dev", "DEVELOPER", "#22c55e"],
        ["حسین", "قاسمی", "hossein@agile.dev", "DEVELOPER", "#06b6d4"],
        ["مریم", "حسینی", "maryam@agile.dev", "DEVELOPER", "#eab308"],
        ["زهرا", "کاظمی", "zahra@agile.dev", "VIEWER", "#14b8a6"],
      ] as const
    ).map(([firstName, lastName, email, role, avatarColor]) =>
      prisma.user.create({
        data: { firstName, lastName, email, role, avatarColor, passwordHash },
      }),
    ),
  );
  const devs = [dev1, dev2, dev3, dev4, dev5];

  console.log("👥 ساخت تیم‌ها…");
  const devTeam = await prisma.team.create({
    data: {
      name: "تیم توسعه",
      description: "تیم اصلی توسعه محصول",
      leaderId: pm.id,
      members: {
        create: [pm, ...devs].map((u) => ({ userId: u.id })),
      },
    },
  });
  await prisma.team.create({
    data: {
      name: "تیم محصول",
      description: "طراحی و مدیریت محصول",
      leaderId: owner.id,
      members: { create: [{ userId: owner.id }, { userId: viewer.id }] },
    },
  });

  async function createProject(opts: {
    key: string;
    name: string;
    description: string;
    icon: string;
    owner: typeof owner;
    members: { userId: string; role: "ADMIN" | "MEMBER" | "VIEWER" }[];
  }) {
    return prisma.project.create({
      data: {
        key: opts.key,
        name: opts.name,
        description: opts.description,
        icon: opts.icon,
        ownerId: opts.owner.id,
        teamId: devTeam.id,
        startDate: daysFromNow(-90),
        endDate: daysFromNow(180),
        members: { create: opts.members },
        statuses: {
          create: [
            { name: "بک‌لاگ", category: "TODO", order: 0, isDefault: true },
            { name: "برای انجام", category: "TODO", order: 1 },
            { name: "در حال انجام", category: "IN_PROGRESS", order: 2 },
            { name: "در بررسی", category: "IN_PROGRESS", order: 3 },
            { name: "انجام شده", category: "DONE", order: 4 },
          ],
        },
        labels: {
          create: [
            { name: "فرانت‌اند", color: "#3b82f6" },
            { name: "بک‌اند", color: "#22c55e" },
            { name: "فوری", color: "#ef4444" },
            { name: "طراحی", color: "#a855f7" },
            { name: "امنیت", color: "#f97316" },
            { name: "کارایی", color: "#06b6d4" },
          ],
        },
      },
      include: { statuses: true, labels: true },
    });
  }

  console.log("🚀 ساخت پروژه‌ها…");
  const gir = await createProject({
    key: "GIR",
    name: "گیرپاژ",
    description: "پلتفرم فروشگاه اینترنتی با درگاه پرداخت اختصاصی",
    icon: "🛒",
    owner,
    members: [
      { userId: pm.id, role: "ADMIN" },
      ...devs.map((d) => ({ userId: d.id, role: "MEMBER" as const })),
      { userId: viewer.id, role: "VIEWER" as const },
    ],
  });

  const chat = await createProject({
    key: "CHAT",
    name: "گفت‌وگو",
    description: "پیام‌رسان داخلی سازمانی با پشتیبانی از کانال‌ها و ربات‌ها",
    icon: "💬",
    owner,
    members: [
      { userId: pm.id, role: "ADMIN" },
      { userId: dev1.id, role: "MEMBER" as const },
      { userId: dev2.id, role: "MEMBER" as const },
      { userId: dev5.id, role: "MEMBER" as const },
    ],
  });

  const st = (p: typeof gir, name: string) => p.statuses.find((s) => s.name === name)!;
  const lb = (p: typeof gir, name: string) => p.labels.find((l) => l.name === name)!;

  console.log("🏃 ساخت اسپرینت‌ها…");
  const s10 = await prisma.sprint.create({
    data: {
      projectId: gir.id,
      name: "اسپرینت ۱۰",
      goal: "راه‌اندازی زیرساخت احراز هویت",
      startDate: daysFromNow(-28),
      endDate: daysFromNow(-15),
      state: "COMPLETED",
    },
  });
  const s11 = await prisma.sprint.create({
    data: {
      projectId: gir.id,
      name: "اسپرینت ۱۱",
      goal: "تکمیل سبد خرید و شروع پرداخت",
      startDate: daysFromNow(-14),
      endDate: daysFromNow(-1),
      state: "COMPLETED",
    },
  });
  const s12 = await prisma.sprint.create({
    data: {
      projectId: gir.id,
      name: "اسپرینت ۱۲",
      goal: "تکمیل سیستم پرداخت آنلاین",
      startDate: daysFromNow(-6),
      endDate: daysFromNow(8),
      state: "ACTIVE",
    },
  });
  const s13 = await prisma.sprint.create({
    data: {
      projectId: gir.id,
      name: "اسپرینت ۱۳",
      goal: "شروع ماژول گزارش‌گیری",
      state: "PLANNED",
    },
  });
  const chatSprint = await prisma.sprint.create({
    data: {
      projectId: chat.id,
      name: "اسپرینت ۱",
      goal: "پیام‌رسانی پایه",
      startDate: daysFromNow(-4),
      endDate: daysFromNow(10),
      state: "ACTIVE",
    },
  });

  type IssueSpec = {
    title: string;
    type?: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
    statusName?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    points?: number | null;
    estimate?: number;
    logged?: number;
    assignee?: typeof dev1 | null;
    sprint?: typeof s12 | null;
    epicTitle?: string;
    dueInDays?: number;
    completedDaysAgo?: number;
    labels?: string[];
    description?: string;
    parentTitle?: string;
  };

  let seq = 0;
  const createdIssues = new Map<string, { id: string; key: string; number: number }>();

  async function makeIssue(project: typeof gir, spec: IssueSpec) {
    seq += 1;
    const number = seq;
    const status = spec.statusName ? st(project, spec.statusName) : null;
    const isDone = status?.category === "DONE";
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number,
        key: `${project.key}-${number}`,
        title: spec.title,
        description: spec.description ?? null,
        type: spec.type ?? "TASK",
        priority: spec.priority ?? "MEDIUM",
        storyPoints: spec.points ?? null,
        estimatedMinutes: spec.estimate ?? null,
        statusId: status?.id ?? null,
        sprintId: spec.sprint === undefined ? null : spec.sprint?.id ?? null,
        assigneeId: spec.assignee === undefined ? null : spec.assignee?.id ?? null,
        reporterId: pm.id,
        dueAt: spec.dueInDays !== undefined ? daysFromNow(spec.dueInDays) : null,
        completedAt:
          spec.completedDaysAgo !== undefined ? daysFromNow(-spec.completedDaysAgo) : isDone ? daysFromNow(-3) : null,
        order: nextOrder(),
        labels: spec.labels
          ? { create: spec.labels.map((name) => ({ labelId: lb(project, name).id })) }
          : undefined,
      },
    });
    createdIssues.set(`${project.key}:${spec.parentTitle ?? ""}${spec.title}`, issue);
    if (spec.logged) {
      await prisma.timeEntry.create({
        data: {
          issueId: issue.id,
          userId: (spec.assignee ?? dev1).id,
          minutes: spec.logged,
          description: "پیاده‌سازی و تست",
          workedAt: hoursAgo(20),
        },
      });
    }
    await prisma.activityLog.create({
      data: {
        issueId: issue.id,
        projectId: project.id,
        userId: pm.id,
        kind: "CREATED",
        meta: { title: issue.title },
        createdAt: hoursAgo(seq * 7),
      },
    });
    return issue;
  }

  console.log("📋 ساخت اپیک‌ها و وظایف گیرپاژ…");

  // ── Epics ──
  const epicPay = await makeIssue(gir, {
    title: "پرداخت آنلاین",
    type: "EPIC",
    statusName: "در حال انجام",
    priority: "HIGH",
    points: 21,
    description: "اتصال به درگاه‌های پرداخت، تسویه و رسید دیجیتال",
  });
  const epicCart = await makeIssue(gir, {
    title: "سبد خرید",
    type: "EPIC",
    statusName: "انجام شده",
    priority: "MEDIUM",
    points: 13,
  });
  const epicAuth = await makeIssue(gir, {
    title: "احراز هویت",
    type: "EPIC",
    statusName: "انجام شده",
    priority: "CRITICAL",
    points: 13,
  });
  const epicReport = await makeIssue(gir, {
    title: "گزارش‌گیری",
    type: "EPIC",
    statusName: "بک‌لاگ",
    priority: "LOW",
    points: 21,
  });

  // helper to link issues to epics afterwards
  async function linkEpic(issueKey: string, epic: { id: string }) {
    await prisma.issue.update({ where: { key: issueKey }, data: { epicId: epic.id } });
  }

  // ── Sprint 10 (completed): auth ──
  const authLogin = await makeIssue(gir, {
    title: "صفحه ورود با رمز عبور",
    type: "STORY",
    statusName: "انجام شده",
    points: 5,
    estimate: 480,
    logged: 420,
    assignee: dev1,
    sprint: s10,
    completedDaysAgo: 24,
    epicTitle: "",
    labels: ["فرانت‌اند", "امنیت"],
  });
  const authOtp = await makeIssue(gir, {
    title: "ورود با پیامک یکبار مصرف",
    type: "STORY",
    statusName: "انجام شده",
    points: 8,
    estimate: 600,
    logged: 660,
    assignee: dev2,
    sprint: s10,
    completedDaysAgo: 22,
    labels: ["بک‌اند", "امنیت"],
  });
  const authBug = await makeIssue(gir, {
    title: "خطای انقضای توکن بعد از یک ساعت",
    type: "BUG",
    statusName: "انجام شده",
    priority: "HIGH",
    points: 3,
    assignee: dev3,
    sprint: s10,
    completedDaysAgo: 20,
    labels: ["بک‌اند"],
  });
  const authSession = await makeIssue(gir, {
    title: "مدیریت نشست‌های همزمان",
    type: "TASK",
    statusName: "انجام شده",
    points: 5,
    assignee: dev4,
    sprint: s10,
    completedDaysAgo: 18,
    labels: ["بک‌اند", "امنیت"],
  });
  for (const i of [authLogin, authOtp, authBug, authSession]) {
    await linkEpic(i.key, epicAuth);
  }

  // ── Sprint 11 (completed): cart ──
  const cartUi = await makeIssue(gir, {
    title: "رابط کاربری سبد خرید",
    type: "STORY",
    statusName: "انجام شده",
    points: 5,
    estimate: 480,
    logged: 500,
    assignee: dev1,
    sprint: s11,
    completedDaysAgo: 12,
    labels: ["فرانت‌اند", "طراحی"],
  });
  const cartLogic = await makeIssue(gir, {
    title: "منطق جمع کل و تخفیف‌ها",
    type: "STORY",
    statusName: "انجام شده",
    points: 8,
    estimate: 720,
    logged: 700,
    assignee: dev2,
    sprint: s11,
    completedDaysAgo: 10,
    labels: ["بک‌اند"],
  });
  const cartPersist = await makeIssue(gir, {
    title: "ذخیره سبد برای کاربر مهمان",
    type: "TASK",
    statusName: "انجام شده",
    points: 3,
    assignee: dev3,
    sprint: s11,
    completedDaysAgo: 8,
    labels: ["بک‌اند"],
  });
  const cartBug = await makeIssue(gir, {
    title: "مقدار منفی در تعداد کالا",
    type: "BUG",
    statusName: "انجام شده",
    priority: "HIGH",
    points: 2,
    assignee: dev5,
    sprint: s11,
    completedDaysAgo: 6,
    labels: ["فرانت‌اند"],
  });
  const cartLeftover = await makeIssue(gir, {
    title: "همگام‌سازی سبد بین دستگاه‌ها",
    type: "STORY",
    statusName: "برای انجام",
    points: 5,
    assignee: dev4,
    sprint: s11,
    labels: ["بک‌اند"],
  });
  for (const i of [cartUi, cartLogic, cartPersist, cartBug, cartLeftover]) {
    await linkEpic(i.key, epicCart);
  }

  // ── Sprint 12 (active): payment ──
  const payGateway = await makeIssue(gir, {
    title: "اتصال به درگاه زرین‌پال",
    type: "STORY",
    statusName: "در حال انجام",
    priority: "CRITICAL",
    points: 8,
    estimate: 960,
    logged: 360,
    assignee: dev2,
    sprint: s12,
    dueInDays: 4,
    labels: ["بک‌اند", "فوری"],
  });
  const payPage = await makeIssue(gir, {
    title: "صفحه پرداخت",
    type: "STORY",
    statusName: "در حال انجام",
    priority: "HIGH",
    points: 5,
    estimate: 480,
    logged: 150,
    assignee: dev1,
    sprint: s12,
    dueInDays: 3,
    labels: ["فرانت‌اند"],
  });
  const payVerify = await makeIssue(gir, {
    title: "تأیید تراکنش و رسید دیجیتال",
    type: "STORY",
    statusName: "در بررسی",
    points: 5,
    estimate: 420,
    logged: 300,
    assignee: dev3,
    sprint: s12,
    dueInDays: 5,
    labels: ["بک‌اند"],
  });
  const payRefund = await makeIssue(gir, {
    title: "بازگشت وجه خودکار",
    type: "TASK",
    statusName: "برای انجام",
    points: 8,
    estimate: 720,
    assignee: dev4,
    sprint: s12,
    labels: ["بک‌اند"],
  });
  const payBug = await makeIssue(gir, {
    title: "دوبار ثبت تراکنش هنگام رفرش صفحه",
    type: "BUG",
    statusName: "در حال انجام",
    priority: "CRITICAL",
    points: 3,
    estimate: 180,
    logged: 90,
    assignee: dev5,
    sprint: s12,
    dueInDays: 1,
    labels: ["فوری", "بک‌اند"],
  });
  const payRetry = await makeIssue(gir, {
    title: "تلاش مجدد در صورت قطعی درگاه",
    type: "TASK",
    statusName: "بک‌لاگ",
    points: 5,
    sprint: s12,
    labels: ["بک‌اند"],
  });
  for (const i of [payGateway, payPage, payVerify, payRefund, payBug, payRetry]) {
    await linkEpic(i.key, epicPay);
  }

  // subtasks of payment page
  const payPageIssue = createdIssues.get(`GIR:${payPage.title}`)!;
  const sub1 = await makeIssue(gir, {
    title: "ساخت UI صفحه پرداخت",
    type: "SUBTASK",
    statusName: "انجام شده",
    estimate: 180,
    logged: 150,
    assignee: dev1,
    sprint: s12,
    parentTitle: payPage.title,
  });
  const sub2 = await makeIssue(gir, {
    title: "اتصال به API پرداخت",
    type: "SUBTASK",
    statusName: "در حال انجام",
    estimate: 180,
    logged: 60,
    assignee: dev1,
    sprint: s12,
    parentTitle: payPage.title,
  });
  const sub3 = await makeIssue(gir, {
    title: "تست جریان پرداخت",
    type: "SUBTASK",
    statusName: "برای انجام",
    estimate: 120,
    assignee: dev1,
    sprint: s12,
    parentTitle: payPage.title,
  });
  for (const s of [sub1, sub2, sub3]) {
    await prisma.issue.update({ where: { id: s.id }, data: { parentId: payPageIssue.id } });
  }

  // ── Backlog (no sprint) ──
  const repCharts = await makeIssue(gir, {
    title: "نمودار فروش ماهانه",
    type: "STORY",
    statusName: "بک‌لاگ",
    points: 8,
    assignee: dev3,
    labels: ["فرانت‌اند"],
  });
  const repExport = await makeIssue(gir, {
    title: "خروجی اکسل گزارش‌ها",
    type: "TASK",
    statusName: "بک‌لاگ",
    points: 5,
    labels: ["بک‌اند"],
  });
  const repFilter = await makeIssue(gir, {
    title: "فیلتر بازه زمانی در گزارش‌ها",
    type: "TASK",
    statusName: "بک‌لاگ",
    points: 3,
  });
  for (const i of [repCharts, repExport, repFilter]) {
    await linkEpic(i.key, epicReport);
  }
  await makeIssue(gir, {
    title: "جستجوی پیشرفته محصولات",
    type: "STORY",
    statusName: "بک‌لاگ",
    points: 13,
    priority: "MEDIUM",
    labels: ["فرانت‌اند", "بک‌اند"],
  });
  await makeIssue(gir, {
    title: "سیستم امتیازدهی کالا",
    type: "STORY",
    statusName: "بک‌لاگ",
    points: 8,
  });
  await makeIssue(gir, {
    title: "بهینه‌سازی کوئری لیست محصولات",
    type: "TASK",
    statusName: "بک‌لاگ",
    priority: "LOW",
    points: 3,
    labels: ["کارایی"],
  });
  await makeIssue(gir, {
    title: "خطای ۵۰۰ در فیلتر برند",
    type: "BUG",
    statusName: "بک‌لاگ",
    priority: "HIGH",
    labels: ["بک‌اند"],
  });
  await makeIssue(gir, {
    title: "یادآوری سبد خرید رهاشده با ایمیل",
    type: "STORY",
    statusName: "بک‌لاگ",
    points: 5,
  });

  // overdue bug
  await makeIssue(gir, {
    title: "رفع مشکل کندی صفحه اصلی",
    type: "BUG",
    statusName: "در حال انجام",
    priority: "CRITICAL",
    points: 5,
    assignee: dev4,
    sprint: s12,
    dueInDays: -2,
    labels: ["کارایی", "فوری"],
  });

  console.log("💬 ساخت وظایف پروژه گفت‌وگو…");
  const chatSeqBase = seq;
  void chatSeqBase;
  const chatIssues: IssueSpec[] = [
    { title: "طراحی صفحه چت", type: "STORY", statusName: "انجام شده", points: 5, assignee: dev1, sprint: chatSprint, completedDaysAgo: 2, labels: ["طراحی"] },
    { title: "وب‌سوکت ارسال پیام", type: "STORY", statusName: "در حال انجام", points: 8, assignee: dev2, sprint: chatSprint, dueInDays: 5, labels: ["بک‌اند"] },
    { title: "لیست کانال‌ها", type: "TASK", statusName: "در بررسی", points: 3, assignee: dev5, sprint: chatSprint, labels: ["فرانت‌اند"] },
    { title: "نمایش وضعیت آنلاین", type: "TASK", statusName: "برای انجام", points: 3, assignee: dev1, sprint: chatSprint },
    { title: "ارسال فایل و تصویر", type: "STORY", statusName: "بک‌لاگ", points: 8 },
    { title: "اعلان پیام جدید", type: "TASK", statusName: "بک‌لاگ", points: 5 },
  ];
  for (const spec of chatIssues) {
    await makeIssue(chat, spec);
  }

  await prisma.project.update({ where: { id: gir.id }, data: { issueSeq: seq - chatIssues.length } });
  await prisma.project.update({ where: { id: chat.id }, data: { issueSeq: seq } });

  console.log("🗨️ کامنت‌ها…");
  const payGatewayIssue = createdIssues.get(`GIR:${payGateway.title}`)!;
  await prisma.comment.createMany({
    data: [
      {
        issueId: payGatewayIssue.id,
        authorId: pm.id,
        body: "@علی لطفاً مستندات درگاه را قبل از استقرار بررسی کن.",
        createdAt: hoursAgo(30),
      },
      {
        issueId: payGatewayIssue.id,
        authorId: dev2.id,
        body: "حله، شنبه تست محیط آزمایشی را انجام می‌دهم.",
        createdAt: hoursAgo(26),
      },
      {
        issueId: payPageIssue.id,
        authorId: dev1.id,
        body: "طراحی جدید در فیگما آپلود شد؛ بازخورد بدهید.",
        createdAt: hoursAgo(10),
      },
    ],
  });

  console.log("🔔 نوتیفیکیشن‌ها…");
  await prisma.notification.createMany({
    data: [
      { userId: dev2.id, type: "ISSUE_ASSIGNED", body: "«اتصال به درگاه زرین‌پال» به شما اختصاص یافت.", link: `/issue/${payGatewayIssue.key}` },
      { userId: dev1.id, type: "MENTION", body: "محمد رضایی در «اتصال به درگاه زرین‌پال» به شما اشاره کرد.", link: `/issue/${payGatewayIssue.key}` },
      { userId: dev5.id, type: "ISSUE_ASSIGNED", body: "«دوبار ثبت تراکنش هنگام رفرش صفحه» به شما اختصاص یافت.", link: `/issue/${createdIssues.get(`GIR:${payBug.title}`)!.key}` },
      { userId: pm.id, type: "COMMENT_ADDED", body: "علی کریمی کامنت جدیدی نوشت.", link: `/issue/${payPageIssue.key}` },
      { userId: dev4.id, type: "OVERDUE", body: "«رفع مشکل کندی صفحه اصلی» از تاریخ تحویل گذشته است.", link: "/my-work" },
    ],
  });

  console.log("📈 فعالیت‌های نمونه…");
  await prisma.activityLog.createMany({
    data: [
      {
        issueId: payGatewayIssue.id,
        projectId: gir.id,
        userId: dev2.id,
        kind: "STATUS_CHANGED",
        field: "status",
        oldValue: "برای انجام",
        newValue: "در حال انجام",
        createdAt: hoursAgo(48),
      },
      {
        issueId: payGatewayIssue.id,
        projectId: gir.id,
        userId: dev2.id,
        kind: "TIME_LOGGED",
        field: "loggedMinutes",
        newValue: "360",
        meta: { minutes: 360 },
        createdAt: hoursAgo(20),
      },
      {
        issueId: payPageIssue.id,
        projectId: gir.id,
        userId: pm.id,
        kind: "POINTS_CHANGED",
        field: "storyPoints",
        oldValue: "3",
        newValue: "5",
        createdAt: hoursAgo(72),
      },
    ],
  });

  console.log("🔖 نمای ذخیره‌شده…");
  await prisma.savedFilter.create({
    data: {
      userId: pm.id,
      projectId: gir.id,
      name: "باگ‌های بحرانی",
      filters: { type: "BUG", priority: "CRITICAL" },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    issues: await prisma.issue.count(),
    sprints: await prisma.sprint.count(),
    comments: await prisma.comment.count(),
  };
  console.log("✅ Seed تمام شد:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
