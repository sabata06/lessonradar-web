import type {
  TeacherApplicationPayload,
  TeacherApplicationResponse,
} from "./schema";

export async function submitTeacherApplication(
  payload: TeacherApplicationPayload,
): Promise<TeacherApplicationResponse> {
  const res = await fetch("/api/teacher-application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as TeacherApplicationResponse;
}
