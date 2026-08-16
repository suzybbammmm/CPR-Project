import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameContextProvider, useGameContext } from './GameContext';

function ModeProbe() {
  const { dataMode } = useGameContext();
  return <span>{dataMode}</span>;
}

describe('GameContextProvider data mode override', () => {
  it('uses simulation for the hardware-free participant experience', () => {
    const html = renderToStaticMarkup(
      <GameContextProvider dataMode="simulation"><ModeProbe /></GameContextProvider>
    );
    expect(html).toContain('simulation');
  });

  it('uses websocket for the real-sensor participant experience', () => {
    const html = renderToStaticMarkup(
      <GameContextProvider dataMode="websocket"><ModeProbe /></GameContextProvider>
    );
    expect(html).toContain('websocket');
  });
});
