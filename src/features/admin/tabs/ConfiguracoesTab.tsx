import React, { useState } from 'react';
import type { PapelParticipante, VinculoParticipante } from '../../../services/classificacoes';
import {
  salvarPapelAdmin,
  excluirPapelAdmin,
} from '../../../services/classificacoes';
import { SectionTitle } from '../components/SectionTitle';

interface ConfiguracoesTabProps {
  papeis: PapelParticipante[];
  vinculos?: VinculoParticipante[];
  onRefresh: () => Promise<void>;
}

export function ConfiguracoesTab({
  papeis,
  onRefresh,
}: ConfiguracoesTabProps) {
  // Papéis Form State
  const [novoPapelNome, setNovoPapelNome] = useState('');
  const [novoPapelCortejo, setNovoPapelCortejo] = useState(false);
  const [papelEmEdicao, setPapelEmEdicao] = useState<PapelParticipante | null>(null);
  const [salvandoPapel, setSalvandoPapel] = useState(false);

  // Mensagens
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const showFeedback = (tipo: 'sucesso' | 'erro', msg: string) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handlers de Papel
  const handleSalvarPapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPapelNome.trim()) return;

    setSalvandoPapel(true);
    const res = await salvarPapelAdmin({
      id: papelEmEdicao?.id,
      nome: novoPapelNome.trim(),
      cortejo: novoPapelCortejo,
    });
    setSalvandoPapel(false);

    if (res.success) {
      showFeedback('sucesso', res.message || 'Papel salvo com sucesso!');
      setNovoPapelNome('');
      setNovoPapelCortejo(false);
      setPapelEmEdicao(null);
      await onRefresh();
    } else {
      showFeedback('erro', res.message || 'Erro ao salvar papel.');
    }
  };

  const handleIniciarEdicaoPapel = (p: PapelParticipante) => {
    setPapelEmEdicao(p);
    setNovoPapelNome(p.nome);
    setNovoPapelCortejo(Boolean(p.cortejo));
  };

  const handleCancelarEdicaoPapel = () => {
    setPapelEmEdicao(null);
    setNovoPapelNome('');
    setNovoPapelCortejo(false);
  };

  const handleExcluirPapel = async (p: PapelParticipante) => {
    if (!p.id) return;
    if (!window.confirm(`Tem certeza que deseja excluir o papel "${p.nome}"?`)) return;

    const res = await excluirPapelAdmin(p.id);
    if (res.success) {
      showFeedback('sucesso', `Papel "${p.nome}" excluído com sucesso!`);
      if (papelEmEdicao?.id === p.id) handleCancelarEdicaoPapel();
      await onRefresh();
    } else {
      showFeedback('erro', res.message || 'Erro ao excluir papel.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#8C7A6B] font-semibold mb-1">
          Configurações do Evento
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-light">
          Papéis dos Participantes
        </h1>
        <p className="text-xs font-serif italic text-[#6B5A4D] mt-1">
          Defina as funções das pessoas na celebração (ex: Convidado comum, Padrinho, Madrinha, Daminha, Pajem).
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-[6px] text-xs font-sans flex justify-between items-center ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border border-rose-300 text-rose-950'
          }`}
        >
          <span>{feedback.msg}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline ml-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: PAPEL NO EVENTO */}
      <div className="bg-white border border-[#E8DFD5] rounded-[12px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-6">
        <div>
          <SectionTitle>Papel no Evento ({papeis.length})</SectionTitle>
          <p className="text-[0.72rem] font-sans text-[#8C7A6B] mt-1">
            Papéis marcados com <strong className="text-[#261811]">Participa do cortejo</strong> têm essa opção sugerida por padrão no cadastro e seus participantes são enviados para a cerimônia.
          </p>
        </div>

        <form onSubmit={handleSalvarPapel} className="p-4 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[8px] space-y-3">
          <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[#543D30] block">
            {papelEmEdicao ? `Editar Papel: ${papelEmEdicao.nome}` : 'Adicionar Novo Papel'}
          </span>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              required
              value={novoPapelNome}
              onChange={(e) => setNovoPapelNome(e.target.value)}
              placeholder="Ex: Convidado comum, Padrinho, Daminha, Pajem, Florista..."
              className="flex-1 bg-white border border-[#D8CDC0] px-3.5 py-2 text-xs font-serif text-[#261811] rounded-[6px] focus:outline-none focus:border-[#261811]"
            />

            <label className="flex items-center gap-1.5 text-xs font-sans text-[#543D30] cursor-pointer shrink-0 select-none">
              <input
                type="checkbox"
                checked={novoPapelCortejo}
                onChange={(e) => setNovoPapelCortejo(e.target.checked)}
                className="accent-[#261811] w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold">Participa do cortejo</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {papelEmEdicao && (
              <button
                type="button"
                onClick={handleCancelarEdicaoPapel}
                className="px-3 py-1.5 border border-[#D8CDC0] text-[#6B5A4D] rounded-[6px] text-xs font-sans uppercase font-medium cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={salvandoPapel}
              className="px-4 py-2 bg-[#261811] hover:bg-[#1A100B] text-white rounded-[6px] text-xs font-sans uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50"
            >
              {salvandoPapel ? 'Salvando...' : papelEmEdicao ? 'Atualizar Papel' : '+ Adicionar Papel'}
            </button>
          </div>
        </form>

        <div className="divide-y divide-[#EAE0D5] border border-[#E8DFD5] rounded-[8px] overflow-hidden bg-white">
          {papeis.map((p) => (
            <div key={p.id || p.nome} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 transition-colors">
              <div className="flex items-center gap-2.5">
                <strong className="font-serif text-sm text-[#261811]">{p.nome}</strong>
                {p.cortejo && (
                  <span className="text-[0.6rem] font-sans tracking-wider uppercase px-2 py-0.5 bg-amber-100 border border-amber-300 rounded text-amber-900 font-semibold">
                    Cortejo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleIniciarEdicaoPapel(p)}
                  className="text-xs font-sans text-[#543D30] hover:text-[#261811] underline cursor-pointer p-1"
                >
                  Editar
                </button>
                {p.id && (
                  <button
                    type="button"
                    onClick={() => handleExcluirPapel(p)}
                    className="text-xs font-sans text-rose-700 hover:text-rose-900 underline cursor-pointer p-1"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}

          {!papeis.length && (
            <div className="p-6 text-center text-xs font-serif italic text-[#8C7A6B]">
              Nenhum papel cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
