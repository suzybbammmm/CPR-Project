import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoleLauncher } from './RoleLauncher';

describe('RoleLauncher', () => {
  it('offers independent participant and instructor demo displays', () => {
    const html = renderToStaticMarkup(<RoleLauncher origin="http://localhost:5173" />);

    expect(html).toContain('LifePulse');
    expect(html).toContain('CPR 시행자 화면');
    expect(html).toContain('강사 관제 화면');
    expect(html).toContain('/participant?mode=demo');
    expect(html).toContain('/instructor?mode=demo');
    expect(html).toContain('/game');
  });
});
