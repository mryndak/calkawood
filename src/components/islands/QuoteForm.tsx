// Directive: client:visible
// QuoteForm — React island, sześciokrokowy kreator wyceny z widełkami cenowymi na żywo
// Validates: Requirements 5.1–5.10, 8.3, 13.4, 15.1

import { useState, useCallback, useMemo, useRef } from 'react';
import { CircleCheck, Info } from 'lucide-react';
import { quoteRequestSchema } from '@/lib/quote-validation';
import {
  TERMS,
  MIN_AREA,
  MAX_AREA,
  AREA_STEP,
  SERVICE_LABELS,
  MATERIAL_LABELS,
  TERM_LABELS,
  estimateRange,
  formatEstimateRange,
  type EstimateService,
  type EstimateMaterial,
  type EstimateTerm,
} from '@/lib/estimate';
import PhotoUpload from './PhotoUpload';

// --- Dane opcji kroków (tytuł + opis wg makiety) ---

const USLUGA_OPTIONS: Array<{ value: EstimateService; desc: string }> = [
  { value: 'domy', desc: 'szkieletowy lub z bali' },
  { value: 'sauna', desc: 'ogrodowa, barrel, domowa' },
  { value: 'taras', desc: 'drewno lub kompozyt' },
  { value: 'zadaszenie', desc: 'wiata, podcień, carport' },
  { value: 'wnetrza', desc: 'deska, schody, zabudowa' },
];

const MATERIAL_OPTIONS: Array<{ value: EstimateMaterial; desc: string }> = [
  { value: 'sosna', desc: 'najtańsza, wymaga olejowania co 2 lata' },
  { value: 'modrzew', desc: 'twardy, żywiczny, klasa trwałości 3' },
  { value: 'kompozyt', desc: 'bez konserwacji, stabilny kolor' },
  { value: 'dab', desc: 'najwyższa trwałość i cena' },
];

const TERMIN_OPTIONS: EstimateTerm[] = [...TERMS];

const TOTAL_STEPS = 6;

// --- Typy ---

interface FormData {
  usluga: EstimateService | '';
  powierzchnia: number;
  material: EstimateMaterial | '';
  termin: EstimateTerm | '';
  zdjecia: File[];
  opis: string; // opis miejsca — krok 5, opcjonalny
  imie: string;
  telefon: string;
  email: string;
  zgoda_rodo: boolean;
  website: string; // honeypot
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_DATA: FormData = {
  usluga: '',
  powierzchnia: 38,
  material: '',
  termin: '',
  zdjecia: [],
  opis: '',
  imie: '',
  telefon: '',
  email: '',
  zgoda_rodo: false,
  website: '',
};

interface QuoteFormProps {
  maxFiles: number;
  maxFileSize: number;
}

function validateStep(step: number, data: FormData): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case 1:
      if (!data.usluga) errors.usluga = 'Wybierz, co planujesz zbudować.';
      break;
    case 3:
      if (!data.material) errors.material = 'Wybierz materiał.';
      break;
    case 4:
      if (!data.termin) errors.termin = 'Wybierz termin.';
      break;
    case 6: {
      const result = quoteRequestSchema.safeParse({
        usluga: data.usluga,
        powierzchnia: data.powierzchnia,
        material: data.material,
        termin: data.termin,
        opis: data.opis.trim() || undefined,
        telefon: data.telefon.trim(),
        imie: data.imie.trim(),
        email: data.email.trim(),
        zgoda_rodo: data.zgoda_rodo,
        website: data.website,
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof FormData;
          if (!errors[field]) errors[field] = issue.message;
        }
      }
      break;
    }
  }
  return errors;
}

export default function QuoteForm({ maxFiles, maxFileSize }: QuoteFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const announceRef = useRef<HTMLDivElement>(null);

  const update = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    const stepErrors = validateStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }, [step, data]);

  const goPrev = useCallback(() => {
    setErrors({});
    setGlobalError(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const restart = useCallback(() => {
    setData(INITIAL_DATA);
    setErrors({});
    setGlobalError(null);
    setIsSent(false);
    setStep(1);
  }, []);

  const handleSubmit = useCallback(async () => {
    const stepErrors = validateStep(6, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);
    setErrors({});

    try {
      const body = new FormData();
      body.append('usluga', data.usluga);
      body.append('powierzchnia', String(data.powierzchnia));
      body.append('material', data.material);
      body.append('termin', data.termin);
      body.append('telefon', data.telefon.trim());
      body.append('imie', data.imie.trim());
      body.append('email', data.email.trim());
      body.append('zgoda_rodo', 'true');
      body.append('website', data.website);
      if (data.opis.trim()) body.append('opis', data.opis.trim());
      for (const file of data.zdjecia) body.append('zdjecia', file);

      const response = await fetch('/api/wycena', { method: 'POST', body });

      if (response.ok) {
        setIsSent(true);
        return;
      }

      if (response.status === 400) {
        const payload = await response.json();
        if (payload.errors && typeof payload.errors === 'object') {
          const serverErrors: FieldErrors = {};
          for (const [key, msg] of Object.entries(payload.errors)) {
            const message = Array.isArray(msg) ? msg[0] : msg;
            if (typeof message === 'string') serverErrors[key as keyof FormData] = message;
          }
          setErrors(serverErrors);
          setGlobalError('Formularz zawiera błędy. Popraw zaznaczone pola.');
        } else {
          setGlobalError(payload.error ?? 'Formularz zawiera błędy. Popraw zaznaczone pola.');
        }
        return;
      }

      if (response.status === 429) {
        setGlobalError('Zbyt wiele zapytań. Spróbuj ponownie za kilka minut.');
        return;
      }

      setGlobalError('Wystąpił błąd serwera. Spróbuj ponownie później lub zadzwoń.');
    } catch {
      setGlobalError('Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  // Widełki cenowe — liczone na żywo, z sensownym fallbackiem zanim usługa/materiał są wybrane
  const range = useMemo(
    () =>
      estimateRange(
        (data.usluga || 'taras') as EstimateService,
        data.powierzchnia,
        (data.material || 'sosna') as EstimateMaterial
      ),
    [data.usluga, data.powierzchnia, data.material]
  );

  if (isSent) {
    return <SentScreen onRestart={restart} />;
  }

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="bg-surface border-b border-hairline">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-10 sm:pt-[70px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kicker">Wycena online</p>
            <h1 className="mt-4 text-4xl leading-none tracking-[-0.025em] text-text sm:text-6xl">
              Sześć pytań, przedział ceny od razu
            </h1>
          </div>
          <span className="text-[13px] tracking-[0.12em] text-text-muted uppercase tabular-nums">
            Krok {step} z {TOTAL_STEPS}
          </span>
        </div>
        <div className="mt-[38px] h-0.5 bg-text/[0.14]">
          <div
            className="h-0.5 bg-primary transition-[width] duration-[350ms] ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div ref={announceRef} aria-live="polite" aria-atomic="true" className="sr-only">
        Krok {step} z {TOTAL_STEPS}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-10 sm:pb-[90px] grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_0.85fr] lg:items-start lg:gap-[60px]">
        {/* Lewa kolumna — pytanie kroku */}
        <div className="pt-10 sm:pt-14 min-h-[420px]">
          {globalError && (
            <div role="alert" className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {globalError}
            </div>
          )}

          {step === 1 && (
            <StepChoice
              heading="Co planujesz zbudować?"
              hint="Wybierz najbliższą kategorię. Jeśli chodzi o kilka rzeczy naraz, dopiszesz to w kroku piątym."
              error={errors.usluga}
            >
              <div className="grid max-w-[560px] gap-3">
                {USLUGA_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    selected={data.usluga === opt.value}
                    onClick={() => update('usluga', opt.value)}
                    title={SERVICE_LABELS[opt.value]}
                    desc={opt.desc}
                    titleSize="text-[23px]"
                  />
                ))}
              </div>
            </StepChoice>
          )}

          {step === 2 && (
            <StepChoice
              heading="Jaka powierzchnia?"
              hint="Przybliżenie wystarczy — dokładny obmiar robimy na miejscu i wtedy cena się doprecyzowuje."
            >
              <div className="max-w-[560px]">
                <div className="mb-[30px] flex items-baseline gap-2.5">
                  <span className="font-serif text-6xl tracking-[-0.03em] tabular-nums text-text sm:text-[86px]">
                    {data.powierzchnia}
                  </span>
                  <span className="font-serif text-2xl text-text-muted sm:text-3xl">m²</span>
                </div>
                <input
                  type="range"
                  min={MIN_AREA}
                  max={MAX_AREA}
                  step={AREA_STEP}
                  value={data.powierzchnia}
                  onChange={(e) => update('powierzchnia', Number(e.target.value))}
                  className="quote-range w-full"
                  aria-label="Powierzchnia w metrach kwadratowych"
                />
                <div className="mt-3.5 flex justify-between text-xs tabular-nums text-text-muted">
                  <span>{MIN_AREA} m²</span>
                  <span>{MAX_AREA} m²</span>
                </div>
              </div>
            </StepChoice>
          )}

          {step === 3 && (
            <StepChoice
              heading="Jakie drewno albo materiał?"
              hint="Materiał ma największy wpływ na cenę i na to, ile pracy wymaga później. Możemy też pokazać próbki na miejscu."
              error={errors.material}
            >
              <div className="grid max-w-[560px] gap-3">
                {MATERIAL_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    selected={data.material === opt.value}
                    onClick={() => update('material', opt.value)}
                    title={MATERIAL_LABELS[opt.value]}
                    desc={opt.desc}
                    titleSize="text-xl"
                  />
                ))}
              </div>
            </StepChoice>
          )}

          {step === 4 && (
            <StepChoice
              heading="Kiedy chcesz zacząć?"
              hint="Terminy na tarasy zamykamy zwykle do końca marca. Domy planujemy z półrocznym wyprzedzeniem."
              error={errors.termin}
            >
              <div className="grid max-w-[520px] gap-2.5">
                {TERMIN_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('termin', value)}
                    className={`w-full rounded-[4px] border px-[22px] py-[18px] text-left font-serif text-lg transition-colors ${
                      data.termin === value ? 'border-primary text-primary-dark' : 'border-text/18 text-text hover:border-primary/50'
                    }`}
                  >
                    {TERM_LABELS[value]}
                  </button>
                ))}
              </div>
            </StepChoice>
          )}

          {step === 5 && (
            <StepChoice
              heading="Pokaż nam miejsce"
              hint="Dwa, trzy zdjęcia działki lub ściany wystarczą, żeby wycena była bliska prawdy. To krok opcjonalny."
            >
              <div className="max-w-[620px]">
                <PhotoUpload
                  files={data.zdjecia}
                  onFilesChange={(files) => update('zdjecia', files)}
                  maxFiles={maxFiles}
                  maxFileSize={maxFileSize}
                />
                <div className="mt-6">
                  <label htmlFor="quote-opis" className="mb-2 block text-xs tracking-[0.1em] text-text-muted uppercase">
                    Opis miejsca — nieobowiązkowo
                  </label>
                  <textarea
                    id="quote-opis"
                    rows={4}
                    value={data.opis}
                    onChange={(e) => update('opis', e.target.value)}
                    placeholder="np. taras na skarpie, wyjście z salonu, obok jest jacuzzi"
                    className="w-full resize-y rounded-[4px] border border-text/20 bg-transparent px-4 py-3.5 font-sans text-base text-text transition-colors focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </StepChoice>
          )}

          {step === 6 && (
            <StepChoice
              heading="Gdzie wysłać wycenę?"
              hint="Ofertę dostajesz mailem, a przy pytaniach dzwonimy. Nie zapisujemy nikogo do newslettera."
            >
              <div className="grid max-w-[520px] gap-5">
                <Field label="Imię i nazwisko" error={errors.imie}>
                  <input
                    type="text"
                    value={data.imie}
                    onChange={(e) => update('imie', e.target.value)}
                    placeholder="Jan Kowalski"
                    autoComplete="name"
                    className={inputClass(!!errors.imie)}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Telefon" error={errors.telefon}>
                    <input
                      type="tel"
                      value={data.telefon}
                      onChange={(e) => update('telefon', e.target.value)}
                      placeholder="600 000 000"
                      autoComplete="tel"
                      className={`${inputClass(!!errors.telefon)} tabular-nums`}
                    />
                  </Field>
                  <Field label="E-mail" error={errors.email}>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="jan@example.pl"
                      autoComplete="email"
                      className={inputClass(!!errors.email)}
                    />
                  </Field>
                </div>
                <label className="flex items-start gap-3 text-[12.5px] leading-[1.6] text-text-muted">
                  <input
                    type="checkbox"
                    checked={data.zgoda_rodo}
                    onChange={(e) => update('zgoda_rodo', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    aria-invalid={!!errors.zgoda_rodo}
                  />
                  <span>
                    Zgadzam się na kontakt w sprawie tego zapytania. Dane wykorzystujemy tylko do przygotowania
                    wyceny.
                  </span>
                </label>
                {errors.zgoda_rodo && (
                  <p role="alert" className="-mt-3 text-sm text-red-700">{errors.zgoda_rodo}</p>
                )}

                {/* Honeypot */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
                  <label htmlFor="quote-website">Website</label>
                  <input
                    type="text"
                    id="quote-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={data.website}
                    onChange={(e) => update('website', e.target.value)}
                  />
                </div>
              </div>
            </StepChoice>
          )}

          {/* Nawigacja */}
          <div className="mt-12 flex items-center gap-3.5 border-t border-hairline pt-[26px]">
            {step > 1 && (
              <button
                type="button"
                onClick={goPrev}
                className="rounded-[4px] border border-text/22 px-[22px] py-3.5 font-serif text-[15px] text-text transition-colors hover:border-primary"
              >
                ← Wstecz
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-[4px] bg-ink px-[30px] py-[15px] font-serif text-base text-background transition-colors hover:bg-ink-hover"
              >
                Dalej →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-[4px] bg-ink px-[30px] py-[15px] font-serif text-base text-background transition-colors hover:bg-ink-hover disabled:opacity-50"
              >
                {isSubmitting ? 'Wysyłanie…' : 'Wyślij zapytanie'}
              </button>
            )}
            <a href="tel:+48661084830" className="ml-auto text-[13.5px] text-text-muted">
              Wolisz porozmawiać? 661 084 830
            </a>
          </div>
        </div>

        {/* Prawa kolumna — panel widełek */}
        <EstimatePanel data={data} range={range} />
      </div>

      <style>{`
        .quote-range {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          background: rgba(32, 31, 29, 0.16);
          border-radius: 1px;
          margin: 8px 0;
        }
        .quote-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #f3f2f2;
          border: 1.5px solid var(--color-primary);
          cursor: pointer;
        }
        .quote-range::-moz-range-thumb {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #f3f2f2;
          border: 1.5px solid var(--color-primary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// --- Podkomponenty ---

function StepChoice({
  heading,
  hint,
  error,
  children,
}: {
  heading: string;
  hint: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 text-3xl leading-[1.05] tracking-[-0.02em] text-text sm:text-[44px]">{heading}</h2>
      <p className="mb-8 max-w-[56ch] text-[15.5px] leading-[1.7] text-text-secondary">{hint}</p>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  desc,
  titleSize,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  titleSize: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-[4px] border px-6 py-[22px] text-left transition-colors ${
        selected ? 'border-primary shadow-[inset_0_0_0_1px_var(--color-primary)]' : 'border-text/18 hover:border-primary/50'
      }`}
    >
      <div className={`font-serif ${titleSize} mb-1 text-text`}>{title}</div>
      <div className="text-[13.5px] text-text-muted">{desc}</div>
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs tracking-[0.1em] text-text-muted uppercase">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-[4px] border bg-transparent px-3.5 py-2.5 font-sans text-base text-text transition-colors focus:outline-none ${
    hasError ? 'border-red-400' : 'border-text/20 focus:border-primary'
  }`;
}

function EstimatePanel({
  data,
  range,
}: {
  data: FormData;
  range: ReturnType<typeof estimateRange>;
}) {
  const summary: Array<[string, string]> = [
    ['Usługa', data.usluga ? SERVICE_LABELS[data.usluga] : '—'],
    ['Powierzchnia', `${data.powierzchnia} m²`],
    ['Materiał', data.material ? MATERIAL_LABELS[data.material] : '—'],
    ['Termin', data.termin ? TERM_LABELS[data.termin] : '—'],
  ];

  return (
    <div className="lg:sticky lg:top-[150px] border border-text/18 rounded-[4px] bg-background">
      <div className="border-b border-hairline px-7 py-[26px]">
        <p className="kicker mb-3.5">Wstępne widełki</p>
        <p className="font-serif text-[33px] leading-[1.15] tracking-[-0.02em] tabular-nums text-text">
          {formatEstimateRange(range)}
        </p>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-text-muted">
          Szacunek na podstawie stawek z 2026 r. Nie jest ofertą — dokładną cenę podajemy po pomiarze.
        </p>
      </div>
      <div className="px-7 py-[22px]">
        <p className="mb-4 text-[11px] tracking-[0.16em] text-text-muted uppercase">Twoje odpowiedzi</p>
        <div>
          {summary.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-text/10 py-[11px] text-[13.5px] last:border-b-0">
              <span className="text-text-muted">{k}</span>
              <span className="text-right text-text">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5 border-t border-accent-border bg-accent-soft px-7 py-5">
        <Info className="mt-0.5 h-[15px] w-[15px] shrink-0 text-primary-dark" strokeWidth={1.6} aria-hidden="true" />
        <p className="text-[12.5px] leading-[1.6] text-primary-dark">
          Wypełnienie zajmuje około dwóch minut. Odpowiadamy w 24 h, także w sobotę.
        </p>
      </div>
    </div>
  );
}

function SentScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="bg-surface border-b border-hairline">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-10 sm:py-[110px]">
        <div className="max-w-[640px]">
          <CircleCheck className="mb-[22px] h-[46px] w-[46px] text-primary" strokeWidth={1.2} aria-hidden="true" />
          <h2 className="mb-[18px] text-4xl leading-[1.04] tracking-[-0.02em] text-text sm:text-5xl">
            Zapytanie wysłane
          </h2>
          <p className="mb-[30px] max-w-[56ch] text-lg leading-[1.75] text-text-secondary">
            Wojciech odezwie się w ciągu 24 godzin — najczęściej tego samego dnia. Kopia zestawienia poszła na
            Twój adres e-mail.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <a
              href="tel:+48661084830"
              className="rounded-[4px] bg-ink px-6 py-[15px] font-serif text-base text-background"
            >
              Nie chcę czekać — dzwonię
            </a>
            <a
              href="/realizacje"
              className="rounded-[4px] border border-text/22 px-6 py-[15px] font-serif text-base text-text"
            >
              Zobacz realizacje w tym czasie
            </a>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-[4px] px-6 py-[15px] font-serif text-base text-primary-dark"
            >
              Wypełnij ponownie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
