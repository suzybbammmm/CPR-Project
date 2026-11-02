import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CprTechniqueGuideScreen } from './CprTechniqueGuideScreen';

describe('CprTechniqueGuideScreen', () => {
  it('makes adult, child, and infant hand placement differences and sources visible', () => {
    const html = renderToStaticMarkup(<CprTechniqueGuideScreen />).normalize('NFC');
    for (const text of ['성인', '소아', '영아', '양손 감싼 두 엄지', '흉골 아래쪽 1/2', '공식 출처', '교육용 안내']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('bg-[#f2f4f6]');
    expect(html).toContain('실습 설정으로');
  });
});
