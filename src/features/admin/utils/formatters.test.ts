import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtNumber,
  getLinkConviteCompleto,
  getLinkRsvpDireto,
  getTextoWhatsAppConvite,
  getLinkFornecedor,
  abrirWhatsAppConvite,
  abrirWhatsAppFornecedor,
} from './formatters';

describe('formatters utils', () => {
  let openedUrl = '';
  let openedTarget = '';

  beforeEach(() => {
    openedUrl = '';
    openedTarget = '';
    (globalThis as any).window = {
      location: {
        origin: 'https://casamento.com',
        pathname: '/app/',
      },
      open: (url: string, target: string) => {
        openedUrl = url;
        openedTarget = target;
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('fmtNumber deve formatar numeros em pt-BR e lidar com undefined', () => {
    assert.equal(fmtNumber(1250), '1.250');
    assert.equal(fmtNumber(0), '0');
    assert.equal(fmtNumber(undefined), '0');
  });

  it('getLinkConviteCompleto deve gerar a URL com parametro ?convite=', () => {
    const link = getLinkConviteCompleto('TN-ABCD');
    assert.equal(link, 'https://casamento.com/app/?convite=TN-ABCD');
  });

  it('getLinkRsvpDireto deve gerar a URL com parametro ?convite= e hash #rsvp', () => {
    const link = getLinkRsvpDireto('TN-ABCD');
    assert.equal(link, 'https://casamento.com/app/?convite=TN-ABCD#rsvp');
  });

  it('getLinkFornecedor deve gerar URL com parametro ?fornecedor=', () => {
    const link = getLinkFornecedor('forn-123');
    assert.equal(link, 'https://casamento.com/app?fornecedor=forn-123');
  });

  it('getTextoWhatsAppConvite deve incluir o link do convite', () => {
    const texto = getTextoWhatsAppConvite('TN-ABCD');
    assert.ok(texto.includes('https://casamento.com/app/?convite=TN-ABCD'));
    assert.ok(texto.includes('Tainara e Thiago'));
  });

  it('abrirWhatsAppConvite deve formatar telefone com DDD e DDI', () => {
    abrirWhatsAppConvite('Familia Silva', 'TN-ABCD', '(11) 98765-4321');
    assert.ok(openedUrl.startsWith('https://wa.me/5511987654321?text='));
    assert.equal(openedTarget, '_blank');
  });

  it('abrirWhatsAppFornecedor deve abrir o link com a mensagem da credencial', () => {
    abrirWhatsAppFornecedor('Banda Show', 'forn-99', '11987654321');
    assert.ok(openedUrl.startsWith('https://wa.me/5511987654321?text='));
    assert.equal(openedTarget, '_blank');
  });
});
