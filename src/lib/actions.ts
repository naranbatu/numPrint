"use server";

import { prisma } from "./prisma";
import { TEAMS, PROBLEMS, LANGUAGES } from "./config";

type SubmitResult = {
  success: boolean;
  error?: string;
};

export async function submitCode(formData: FormData): Promise<SubmitResult> {
  const teamName = formData.get("teamName") as string;
  const problem = formData.get("problem") as string;
  const language = formData.get("language") as string;
  const code = formData.get("code") as string;

  if (!teamName || !problem || !language || !code) {
    return { success: false, error: "Бүх талбарыг бөглөнө үү" };
  }

  if (!(TEAMS as readonly string[]).includes(teamName)) {
    return { success: false, error: "Буруу баг сонгогдсон" };
  }

  if (!(PROBLEMS as readonly string[]).includes(problem)) {
    return { success: false, error: "Буруу бодлого сонгогдсон" };
  }

  if (!(LANGUAGES as readonly string[]).includes(language)) {
    return { success: false, error: "Буруу хэл сонгогдсон" };
  }

  if (code.trim().length === 0) {
    return { success: false, error: "Код хоосон байна" };
  }

  const aiDetected = formData.get("aiDetected") === "true";
  const aiDetails = (formData.get("aiDetails") as string) || null;

  try {
    await prisma.submission.create({
      data: { teamName, problem, language, code, aiDetected, aiDetails },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to create submission:", error);
    return { success: false, error: "Серверийн алдаа. Дахин оролдоно уу." };
  }
}

export type Submission = {
  id: string;
  teamName: string;
  problem: string;
  language: string;
  code: string;
  printed: boolean;
  aiDetected: boolean;
  aiDetails: string | null;
  createdAt: string;
};

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

async function cleanupExpired() {
  const cutoff = new Date(Date.now() - EXPIRY_MS);
  await prisma.submission.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}

type AdminResult = {
  success: boolean;
  submissions?: Submission[];
  error?: string;
};

export async function getSubmissions(password: string): Promise<AdminResult> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Нууц үг буруу байна" };
  }

  try {
    await cleanupExpired();

    const submissions = await prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      submissions: submissions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return { success: false, error: "Серверийн алдаа" };
  }
}

export async function togglePrinted(
  password: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Нууц үг буруу" };
  }

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return { success: false, error: "Олдсонгүй" };
    }

    await prisma.submission.update({
      where: { id },
      data: { printed: !submission.printed },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle printed:", error);
    return { success: false, error: "Серверийн алдаа" };
  }
}

export async function deleteSubmission(
  password: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Нууц үг буруу" };
  }

  try {
    await prisma.submission.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return { success: false, error: "Серверийн алдаа" };
  }
}
