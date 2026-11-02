import React, { useCallback, useEffect, useState } from 'react';
import type { ParticipantInfo } from '../types/exhibition.types';

const DATA_RETENTION_DAYS = parseInt(import.meta.env.VITE_DATA_RETENTION_DAYS ?? '90', 10);

const SN_RE = /^[A-Za-z0-9-]+$/;

type FieldKey = 'studentNumber' | 'name' | 'phone';
interface FieldErrors { studentNumber?: string; name?: string; phone?: string; }
interface TouchedFields { studentNumber: boolean; name: boolean; phone: boolean; }

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function validateField(field: FieldKey, value: string): string | undefined {
  const v = value.trim();
  if (field === 'studentNumber') {
    if (v.length < 4 || v.length > 20) return '학번은 4~20자여야 합니다.';
    if (!SN_RE.test(v)) return '영문, 숫자, 하이픈(-)만 사용할 수 있습니다.';
  } else if (field === 'name') {
    if (v.length < 2 || v.length > 30) return '이름은 2~30자여야 합니다.';
  } else if (field === 'phone') {
    if (!v) return undefined; // optional
    const digits = v.replace(/\D/g, '');
    if (!/^01[0-9]\d{7,8}$/.test(digits)) return '올바른 전화번호를 입력해주세요. (예: 010-1234-5678)';
  }
  return undefined;
}

interface Props {
  playerCount: number;
  onSubmit: (participants: ParticipantInfo[]) => void;
  onCancel: () => void;
}

export function ParticipantRegistrationForm({ playerCount, onSubmit, onCancel }: Props) {
  const empty = (): ParticipantInfo => ({ studentNumber: '', name: '', phone: '' });
  const emptyErrors = (): FieldErrors => ({});
  const emptyTouched = (): TouchedFields => ({ studentNumber: false, name: false, phone: false });

  const [values, setValues] = useState<ParticipantInfo[]>(() =>
    Array.from({ length: playerCount }, empty),
  );
  const [errors, setErrors] = useState<FieldErrors[]>(() =>
    Array.from({ length: playerCount }, emptyErrors),
  );
  const [touched, setTouched] = useState<TouchedFields[]>(() =>
    Array.from({ length: playerCount }, emptyTouched),
  );

  useEffect(() => {
    setValues((prev) => Array.from({ length: playerCount }, (_, i) => prev[i] ?? empty()));
    setErrors(Array.from({ length: playerCount }, emptyErrors));
    setTouched(Array.from({ length: playerCount }, emptyTouched));
  }, [playerCount]);

  const update = useCallback((index: number, field: FieldKey, raw: string) => {
    const value = field === 'phone' ? formatPhone(raw) : raw.trimStart();
    setValues((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    setErrors((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: validateField(field, value) } : e)),
    );
  }, []);

  const blur = useCallback((index: number, field: FieldKey) => {
    setTouched((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: true } : t)));
    if (field !== 'phone') {
      setValues((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: (p[field] ?? '').trim() } : p)),
      );
    }
  }, []);

  const validate = useCallback(() => {
    const newErrors = values.map((p) => ({
      studentNumber: validateField('studentNumber', p.studentNumber),
      name: validateField('name', p.name),
      phone: validateField('phone', p.phone ?? ''),
    }));
    setErrors(newErrors);
    setTouched(Array.from({ length: playerCount }, () => ({ studentNumber: true, name: true, phone: true })));
    return newErrors.every((e) => !e.studentNumber && !e.name && !e.phone);
  }, [values, playerCount]);

  const checkDuplicates = useCallback(() => {
    const seen = new Set<string>();
    for (const p of values) {
      const key = `${p.studentNumber.trim().toLowerCase()}|${p.name.trim()}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [values]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (checkDuplicates()) {
      alert('같은 세션에 동일한 학번과 이름의 참가자를 중복 등록할 수 없습니다.');
      return;
    }
    onSubmit(values.map((p) => ({
      studentNumber: p.studentNumber.trim(),
      name: p.name.trim(),
      phone: p.phone?.trim() || undefined,
    })));
  };

  const allFilled = values.every(
    (p) => p.studentNumber.trim().length >= 4 && p.name.trim().length >= 2,
  );

  return (
    <section className="tp-registration tp-panel" aria-labelledby="reg-title">
      <div className="tp-registration-header">
        <span className="tp-eyebrow">PARTICIPANT REGISTRATION</span>
        <h2 id="reg-title">참가자 정보를 입력해주세요</h2>
        <p>학번과 이름을 입력하면 결과가 기록되고 랭킹에 반영됩니다.</p>
      </div>

      <form className="tp-registration-form" onSubmit={handleSubmit} noValidate aria-label="참가자 등록 양식">
        {values.map((p, i) => (
          <fieldset key={i} className="tp-reg-player">
            <legend className="tp-person-label">
              <span className="tp-person" aria-hidden="true">{i + 1}</span>
              {i + 1}번 참가자
            </legend>

            <div className="tp-reg-fields">
              <div className="tp-reg-field">
                <label htmlFor={`sn-${i}`}>학번 <span className="tp-required">*</span></label>
                <input
                  id={`sn-${i}`}
                  type="text"
                  required
                  autoComplete="off"
                  inputMode="text"
                  placeholder="예: 20231234"
                  aria-invalid={touched[i]?.studentNumber && !!errors[i]?.studentNumber}
                  aria-describedby={errors[i]?.studentNumber ? `sn-err-${i}` : undefined}
                  value={p.studentNumber}
                  onChange={(e) => update(i, 'studentNumber', e.target.value)}
                  onBlur={() => blur(i, 'studentNumber')}
                />
                {touched[i]?.studentNumber && errors[i]?.studentNumber && (
                  <span id={`sn-err-${i}`} className="tp-field-error" role="alert">
                    {errors[i].studentNumber}
                  </span>
                )}
              </div>

              <div className="tp-reg-field">
                <label htmlFor={`name-${i}`}>이름 <span className="tp-required">*</span></label>
                <input
                  id={`name-${i}`}
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="예: 김지윤"
                  aria-invalid={touched[i]?.name && !!errors[i]?.name}
                  aria-describedby={errors[i]?.name ? `name-err-${i}` : undefined}
                  value={p.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  onBlur={() => blur(i, 'name')}
                />
                {touched[i]?.name && errors[i]?.name && (
                  <span id={`name-err-${i}`} className="tp-field-error" role="alert">
                    {errors[i].name}
                  </span>
                )}
              </div>

              <div className="tp-reg-field">
                <label htmlFor={`phone-${i}`}>전화번호 <span className="tp-optional">(선택)</span></label>
                <input
                  id={`phone-${i}`}
                  type="tel"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="예: 010-1234-5678"
                  aria-invalid={touched[i]?.phone && !!errors[i]?.phone}
                  aria-describedby={errors[i]?.phone ? `phone-err-${i}` : undefined}
                  value={p.phone ?? ''}
                  onChange={(e) => update(i, 'phone', e.target.value)}
                  onBlur={() => blur(i, 'phone')}
                />
                {touched[i]?.phone && errors[i]?.phone && (
                  <span id={`phone-err-${i}`} className="tp-field-error" role="alert">
                    {errors[i].phone}
                  </span>
                )}
              </div>
            </div>
          </fieldset>
        ))}

        <p className="tp-privacy-notice" role="note">
          입력한 정보는 실습 결과 기록 및 순위 산정에만 활용되며,{' '}
          {DATA_RETENTION_DAYS}일 후 자동 삭제됩니다.
          공개 랭킹에서는 마스킹 처리(김*윤 / 2023****)됩니다.
          전화번호는 공개되지 않습니다.
        </p>

        <div className="tp-reg-actions">
          <button type="submit" className="tp-primary" disabled={!allFilled}>
            실습 시작 →
          </button>
          <button type="button" className="tp-text-button" onClick={onCancel}>
            ← 설정으로 돌아가기
          </button>
        </div>
      </form>
    </section>
  );
}
