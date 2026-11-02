/** Mirrors Python privacy.py mask_name / mask_student_number exactly. */

export function maskName(name: string): string {
  const chars = [...name];
  if (chars.length <= 1) return name;
  if (chars.length === 2) return chars[0] + '*';
  return chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1];
}

export function maskStudentNumber(sn: string): string {
  if (sn.length < 4) return '*'.repeat(sn.length);
  return sn.slice(0, 4) + '*'.repeat(sn.length - 4);
}
