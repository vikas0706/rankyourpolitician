'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { PROBLEMS, PROBLEM_META, PROBLEM_ROUTES, OFFICE_META, CPGRAMS_URL } from '@/lib/offices';
import { PROBLEM_CHAIN, ESCALATION_CHAINS } from '@/lib/escalation';
import type { ProblemType } from '@/lib/types';
import Icon from './Icon';
import EscalationChain from './EscalationChain';

export default function Finder() {
  const { t } = useI18n();
  const [problem, setProblem] = useState<ProblemType | null>(null);
  const [area, setArea] = useState<'urban' | 'rural'>('urban');

  const offices = problem ? PROBLEM_ROUTES[problem][area] : [];

  return (
    <div>
      {/* Step 1: problem grid */}
      <p className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">{t('finder.pickProblem')}</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {PROBLEMS.map((p) => {
          const active = problem === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProblem(p)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                active ? 'border-brand bg-brand-soft text-brand-ink shadow-soft' : 'border-line bg-white text-ink-soft hover:border-brand/40'
              }`}
            >
              <span className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand text-white' : 'bg-paper-sink text-ink-faint'}`}>
                <Icon name={PROBLEM_META[p].icon} size={18} />
              </span>
              <span className="text-sm font-semibold leading-tight">{t(`problems.${p}`)}</span>
            </button>
          );
        })}
      </div>

      {/* Step 2: area type */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold uppercase tracking-wide text-ink-faint">{t('finder.areaType')}</span>
        <div className="inline-flex rounded-full bg-paper-sink p-1 text-sm font-semibold">
          {(['urban', 'rural'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded-full px-4 py-1.5 ${area === a ? 'bg-white text-brand shadow-sm' : 'text-ink-faint'}`}
            >
              {t(`finder.${a}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: results */}
      <div className="mt-6">
        {!problem ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper-soft p-8 text-center text-ink-faint">
            {t('finder.chooseAbove')}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
                <Icon name={PROBLEM_META[problem].icon} size={18} />
              </span>
              <h2 className="text-lg font-bold text-ink">{t(`problems.${problem}`)}</h2>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink-soft">{t('finder.responsible')}</p>
            <p className="text-xs text-ink-faint">{t('finder.orderNote')}</p>

            <ol className="mt-3 space-y-3">
              {offices.map((o, i) => (
                <li key={o} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-bold text-ink">
                        <Icon name={OFFICE_META[o].icon} size={16} className="text-brand" />
                        {t(`offices.${o}.label`)}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{t(`offices.${o}.handles`)}</p>
                      <p className="mt-2 text-xs">
                        <span className="font-semibold text-ink-faint">{t('finder.escalateLabel')}: </span>
                        <span className="text-ink-soft">{t(`offices.${o}.escalate`)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {/* Full escalation ladder (verified reporting chain of officials) */}
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink-faint">
                <Icon name="layers" size={15} className="text-brand" /> {t('finder.escalationTitle')}
              </p>
              <EscalationChain
                chain={ESCALATION_CHAINS[PROBLEM_CHAIN[problem][area]]}
                labels={{
                  startHere: t('escalation.startHere'),
                  escalate: t('escalation.escalate'),
                  covers: t('escalation.covers'),
                  thisOffice: t('escalation.thisOffice'),
                  varies: t('escalation.varies'),
                  sources: t('escalation.sources'),
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <a href={CPGRAMS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-ink">
                <Icon name="megaphone" size={15} /> {t('finder.complainCta')}
              </a>
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:border-brand hover:text-brand">
                <Icon name="pin" size={15} /> {t('finder.findPerson')}
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              <Icon name="info" size={14} className="mr-1 inline" />
              {area === 'urban' ? t('finder.parallelCouncillor') : t('finder.parallelPanchayat')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/accountability" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <Icon name="info" size={15} /> {t('finder.learnTiers')}
        </Link>
        <p className="text-xs text-ink-faint">{t('finder.disclaimer')}</p>
      </div>
    </div>
  );
}
