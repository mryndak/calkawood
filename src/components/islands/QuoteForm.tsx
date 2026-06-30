// Directive: client:visible
// QuoteForm — React island wielokrokowy formularz wyceny online
// Validates: Requirements 5.1–5.10, 8.3, 13.4, 15.1

import { useState, useCallback, useRef } from 'react';
import { z } from 'zod';
import {
  quoteRequestSchema,
  type ServiceCategory,
} from '@/lib/quote-validation';
import PhotoUpload from './PhotoUpload';

// --- Types ---

interface QuoteFormProps {
  services: Array<{ id: string; label: string }>;
  maxFiles: number;
  maxFileSize: number; // bytes
}

interface FormData {
  usluga: ServiceCategory | '';
  opis: string;
  zdjecia: File[];
  wymiary: string;
  imie: string;
  telefon: string;
  email: string;
  powiat: string;
  zgoda_rodo: boolean;
  website: string; // honeypot
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

// --- Constants ---

const TOTAL_STEPS = 6;

const POWIATY = [
  'brzozowski',
  'dębicki',
  'jasielski',
  'łańcucki',
  'ropczycko-sędziszowski',
  'rzeszowski',
  'strzyżowski',
  'Rzeszów (miasto)',
  'Krosno (miasto)',
];



// --- Helpers ---

function getStepLabel(step: number): string {
  const labels: Record<number, string> = {
    1: 'Usługa',
    2: 'Opis',
    3: 'Zdjęcia',
    4: 'Wymiary',
    5: 'Dane kontaktowe',
    6: 'Podsumowanie',
  };
  return labels[step] ?? '';
}


// --- Step validation schemas ---

function validateStep(step: number, data: FormData): FieldErrors {
  const errors: FieldErrors = {};

  switch (step) {
    case 1: {
      if (!data.usluga) {
        errors.usluga = 'Wybierz rodzaj usługi.';
      }
      break;
    }
    case 2: {
      if (!data.opis.trim()) {
        errors.opis = 'Podaj opis zlecenia.';
      } else if (data.opis.trim().length < 20) {
        errors.opis = 'Opis musi mieć minimum 20 znaków.';
      }
      break;
    }
    case 3: {
      // Photos are optional — no validation required
      break;
    }
    case 4: {
      // Dimensions are optional — no validation required
      break;
    }
    case 5: {
      if (!data.imie.trim()) {
        errors.imie = 'Podaj imię.';
      } else if (data.imie.trim().length < 2) {
        errors.imie = 'Imię musi mieć minimum 2 znaki.';
      }

      if (!data.telefon.trim()) {
        errors.telefon = 'Podaj numer telefonu.';
      } else if (!/^\+?48?\s?\d{3}\s?\d{3}\s?\d{3}$/.test(data.telefon.trim())) {
        errors.telefon = 'Nieprawidłowy numer telefonu.';
      }

      if (!data.email.trim()) {
        errors.email = 'Podaj adres e-mail.';
      } else {
        const emailResult = z.string().email().safeParse(data.email.trim());
        if (!emailResult.success) {
          errors.email = 'Nieprawidłowy adres e-mail.';
        }
      }

      if (!data.zgoda_rodo) {
        errors.zgoda_rodo = 'Wymagana zgoda na przetwarzanie danych.';
      }
      break;
    }
    case 6: {
      // Full validation before submit
      const result = quoteRequestSchema.safeParse({
        usluga: data.usluga,
        opis: data.opis.trim(),
        telefon: data.telefon.trim(),
        imie: data.imie.trim(),
        email: data.email.trim(),
        powiat: data.powiat || undefined,
        zgoda_rodo: data.zgoda_rodo,
        wymiary: data.wymiary.trim() || undefined,
        website: data.website,
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof FormData;
          if (!errors[field]) {
            errors[field] = issue.message;
          }
        }
      }
      break;
    }
  }

  return errors;
}

// --- Component ---

export default function QuoteForm({ services, maxFiles, maxFileSize }: QuoteFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    usluga: '',
    opis: '',
    zdjecia: [],
    wymiary: '',
    imie: '',
    telefon: '',
    email: '',
    powiat: '',
    zgoda_rodo: false,
    website: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    setFieldErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const goNext = useCallback(() => {
    const errors = validateStep(currentStep, formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [currentStep, formData]);

  const goBack = useCallback(() => {
    setFieldErrors({});
    setGlobalError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Full validation
    const errors = validateStep(6, formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);
    setFieldErrors({});

    try {
      const body = new FormData();
      body.append('usluga', formData.usluga);
      body.append('opis', formData.opis.trim());
      body.append('telefon', formData.telefon.trim());
      body.append('imie', formData.imie.trim());
      body.append('email', formData.email.trim());
      body.append('zgoda_rodo', 'true');
      body.append('website', formData.website); // honeypot

      if (formData.powiat) {
        body.append('powiat', formData.powiat);
      }
      if (formData.wymiary.trim()) {
        body.append('wymiary', formData.wymiary.trim());
      }

      for (const file of formData.zdjecia) {
        body.append('zdjecia', file);
      }

      const response = await fetch('/api/wycena', {
        method: 'POST',
        body,
      });

      if (response.ok) {
        setIsSuccess(true);
        return;
      }

      if (response.status === 400) {
        const data = await response.json();
        // API zwraca błędy pól pod kluczem `errors` (Zod flatten → string[] na pole)
        if (data.errors && typeof data.errors === 'object') {
          const serverErrors: FieldErrors = {};
          for (const [key, msg] of Object.entries(data.errors)) {
            const message = Array.isArray(msg) ? msg[0] : msg;
            if (typeof message === 'string') {
              serverErrors[key as keyof FormData] = message;
            }
          }
          setFieldErrors(serverErrors);
          // Jeśli błąd dotyczy wcześniejszego kroku, cofnij do kroku z danymi kontaktowymi
          setGlobalError('Formularz zawiera błędy. Popraw zaznaczone pola.');
        } else {
          // Błędy ogólne (np. walidacja plików) API zwraca pod kluczem `error`
          setGlobalError(data.error ?? 'Formularz zawiera błędy. Popraw zaznaczone pola.');
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
  }, [formData]);

  // --- Success screen ---

  if (isSuccess) {
    return (
      <div className="rounded-xl bg-accent/10 border border-accent/30 p-8 text-center" role="status" aria-live="polite">
        <svg className="mx-auto h-12 w-12 text-accent mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h2 className="text-2xl font-bold text-primary-dark mb-2">Dziękujemy!</h2>
        <p className="text-text/80 text-lg">Otrzymaliśmy Twoje zapytanie. Odpowiemy w ciągu 24 godzin.</p>
      </div>
    );
  }

  // --- Render ---

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (currentStep === TOTAL_STEPS) {
          handleSubmit();
        } else {
          goNext();
        }
      }}
      noValidate
      className="w-full max-w-2xl mx-auto"
    >
      {/* Live region for announcements */}
      <div ref={announceRef} aria-live="polite" aria-atomic="true" className="sr-only">
        Krok {currentStep} z {TOTAL_STEPS}: {getStepLabel(currentStep)}
      </div>

      {/* Progress indicator */}
      <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Global error */}
      {globalError && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm"
        >
          {globalError}
        </div>
      )}

      {/* Steps */}
      <div className="min-h-[320px]">
        {currentStep === 1 && (
          <StepService
            value={formData.usluga}
            services={services}
            error={fieldErrors.usluga}
            onChange={(val) => updateField('usluga', val)}
          />
        )}
        {currentStep === 2 && (
          <StepDescription
            value={formData.opis}
            error={fieldErrors.opis}
            onChange={(val) => updateField('opis', val)}
          />
        )}
        {currentStep === 3 && (
          <StepPhotos
            files={formData.zdjecia}
            maxFiles={maxFiles}
            maxFileSize={maxFileSize}
            onChange={(files) => updateField('zdjecia', files)}
          />
        )}
        {currentStep === 4 && (
          <StepDimensions
            value={formData.wymiary}
            onChange={(val) => updateField('wymiary', val)}
          />
        )}
        {currentStep === 5 && (
          <StepContact
            data={formData}
            errors={fieldErrors}
            onChange={updateField}
          />
        )}
        {currentStep === 6 && (
          <StepSummary data={formData} services={services} errors={fieldErrors} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-primary/10">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-primary-dark hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wstecz
          </button>
        ) : (
          <span />
        )}

        {currentStep < TOTAL_STEPS ? (
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-cta px-6 py-2.5 text-sm font-semibold text-white hover:bg-cta-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2"
          >
            Dalej
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-cta px-6 py-2.5 text-sm font-semibold text-white hover:bg-cta-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wysyłanie...
              </>
            ) : (
              'Wyślij zapytanie'
            )}
          </button>
        )}
      </div>

      {/* Honeypot — hidden from users and assistive tech */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label htmlFor="quote-website">Website</label>
        <input
          type="text"
          id="quote-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => updateField('website', e.target.value)}
        />
      </div>
    </form>
  );
}


// --- Sub-components ---

// Progress indicator
function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-primary-dark">
          Krok {currentStep} z {totalSteps}
        </span>
        <span className="text-sm text-text/60">{getStepLabel(currentStep)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-primary/10" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
        <div
          className="h-2 rounded-full bg-cta transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Step 1: Service selection
function StepService({
  value,
  services,
  error,
  onChange,
}: {
  value: string;
  services: Array<{ id: string; label: string }>;
  error?: string;
  onChange: (val: ServiceCategory) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xl font-bold text-primary-dark mb-2">Wybierz rodzaj usługi</legend>
      <p className="text-text/60 text-sm mb-6">Jaki typ usługi Cię interesuje?</p>

      {error && (
        <p role="alert" id="usluga-error" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-describedby={error ? 'usluga-error' : undefined}>
        {services.map((service) => {
          const isSelected = value === service.id;
          return (
            <label
              key={service.id}
              className={`relative flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all hover:border-cta/50 focus-within:ring-2 focus-within:ring-cta focus-within:ring-offset-2 ${
                isSelected ? 'border-cta bg-cta/5' : 'border-primary/20 bg-white'
              }`}
            >
              <input
                type="radio"
                name="usluga"
                value={service.id}
                checked={isSelected}
                onChange={() => onChange(service.id as ServiceCategory)}
                className="sr-only"
                aria-describedby={error ? 'usluga-error' : undefined}
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-cta bg-cta' : 'border-primary/30'
                }`}
                aria-hidden="true"
              >
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="4" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${isSelected ? 'text-primary-dark' : 'text-text'}`}>
                {service.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Step 2: Description
function StepDescription({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (val: string) => void;
}) {
  const charCount = value.trim().length;
  const minChars = 20;

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">Opisz swoje zlecenie</h2>
      <p className="text-text/60 text-sm mb-6">Im więcej szczegółów, tym trafniejsza wycena.</p>

      <div>
        <label htmlFor="quote-opis" className="block text-sm font-medium text-text mb-1.5">
          Opis zlecenia <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          id="quote-opis"
          name="opis"
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Np. Chcę postawić altanę 4x3m z dachem dwuspadowym w ogrodzie..."
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? 'opis-error' : 'opis-hint'}
          className={`w-full rounded-lg border px-4 py-3 text-sm text-text placeholder:text-text/40 resize-y focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors ${
            error ? 'border-red-400 bg-red-50/50' : 'border-primary/20 bg-white'
          }`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {error ? (
            <p id="opis-error" role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : (
            <p id="opis-hint" className="text-xs text-text/50">
              Minimum {minChars} znaków
            </p>
          )}
          <span
            className={`text-xs ${charCount < minChars ? 'text-text/50' : 'text-accent'}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {charCount}/{minChars}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 3: Photos — uses PhotoUpload component with drag & drop, previews, compression
function StepPhotos({
  files,
  maxFiles,
  maxFileSize,
  onChange,
}: {
  files: File[];
  maxFiles: number;
  maxFileSize: number;
  onChange: (files: File[]) => void;
}) {
  const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">Dodaj zdjęcia (opcjonalnie)</h2>
      <p className="text-text/60 text-sm mb-6">
        Zdjęcia pomagają lepiej ocenić zakres prac. Maks. {maxFiles} plików, do {maxSizeMB} MB każdy.
      </p>

      <PhotoUpload
        files={files}
        onFilesChange={onChange}
        maxFiles={maxFiles}
        maxFileSize={maxFileSize}
      />
    </div>
  );
}

// Step 4: Dimensions
function StepDimensions({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">Podaj wymiary (opcjonalnie)</h2>
      <p className="text-text/60 text-sm mb-6">
        Jeśli znasz wymiary lub parametry projektu, wpisz je poniżej.
      </p>

      <div>
        <label htmlFor="quote-wymiary" className="block text-sm font-medium text-text mb-1.5">
          Wymiary / parametry
        </label>
        <textarea
          id="quote-wymiary"
          name="wymiary"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Np. szerokość 4m, głębokość 3m, wysokość 2.5m"
          className="w-full rounded-lg border border-primary/20 bg-white px-4 py-3 text-sm text-text placeholder:text-text/40 resize-y focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors"
        />
      </div>
    </div>
  );
}


// Step 5: Contact details
function StepContact({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: FieldErrors;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">Twoje dane kontaktowe</h2>
      <p className="text-text/60 text-sm mb-6">Potrzebujemy ich, żeby przesłać wycenę.</p>

      <div className="space-y-4">
        {/* Imię */}
        <div>
          <label htmlFor="quote-imie" className="block text-sm font-medium text-text mb-1.5">
            Imię <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="quote-imie"
            name="imie"
            value={data.imie}
            onChange={(e) => onChange('imie', e.target.value)}
            placeholder="Jan"
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={!!errors.imie}
            aria-describedby={errors.imie ? 'imie-error' : undefined}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors ${
              errors.imie ? 'border-red-400 bg-red-50/50' : 'border-primary/20 bg-white'
            }`}
          />
          {errors.imie && (
            <p id="imie-error" role="alert" className="mt-1 text-sm text-red-700">{errors.imie}</p>
          )}
        </div>

        {/* Telefon */}
        <div>
          <label htmlFor="quote-telefon" className="block text-sm font-medium text-text mb-1.5">
            Numer telefonu <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            type="tel"
            id="quote-telefon"
            name="telefon"
            value={data.telefon}
            onChange={(e) => onChange('telefon', e.target.value)}
            placeholder="+48 123 456 789"
            autoComplete="tel"
            aria-required="true"
            aria-invalid={!!errors.telefon}
            aria-describedby={errors.telefon ? 'telefon-error' : undefined}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors ${
              errors.telefon ? 'border-red-400 bg-red-50/50' : 'border-primary/20 bg-white'
            }`}
          />
          {errors.telefon && (
            <p id="telefon-error" role="alert" className="mt-1 text-sm text-red-700">{errors.telefon}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="quote-email" className="block text-sm font-medium text-text mb-1.5">
            Adres e-mail <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="quote-email"
            name="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="jan@example.pl"
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors ${
              errors.email ? 'border-red-400 bg-red-50/50' : 'border-primary/20 bg-white'
            }`}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-sm text-red-700">{errors.email}</p>
          )}
        </div>

        {/* Powiat */}
        <div>
          <label htmlFor="quote-powiat" className="block text-sm font-medium text-text mb-1.5">
            Powiat <span className="text-text/40 text-xs font-normal">(opcjonalnie)</span>
          </label>
          <select
            id="quote-powiat"
            name="powiat"
            value={data.powiat}
            onChange={(e) => onChange('powiat', e.target.value)}
            className="w-full rounded-lg border border-primary/20 bg-white px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-cta focus:border-cta transition-colors"
          >
            <option value="">Wybierz powiat (opcjonalnie)</option>
            {POWIATY.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Zgoda RODO */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="zgoda_rodo"
              checked={data.zgoda_rodo}
              onChange={(e) => onChange('zgoda_rodo', e.target.checked)}
              aria-required="true"
              aria-invalid={!!errors.zgoda_rodo}
              aria-describedby={errors.zgoda_rodo ? 'rodo-error' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/30 text-cta focus:ring-cta focus:ring-2"
            />
            <span className="text-sm text-text">
              Zgadzam się na przetwarzanie moich danych osobowych w celu przygotowania wyceny.{' '}
              <a
                href="/polityka-prywatnosci"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-dark underline hover:text-cta transition-colors"
              >
                Polityka prywatności
              </a>
              {' '}<span className="text-red-600" aria-hidden="true">*</span>
            </span>
          </label>
          {errors.zgoda_rodo && (
            <p id="rodo-error" role="alert" className="mt-1 ml-7 text-sm text-red-700">{errors.zgoda_rodo}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 6: Summary
function StepSummary({
  data,
  services,
  errors,
}: {
  data: FormData;
  services: Array<{ id: string; label: string }>;
  errors: FieldErrors;
}) {
  const serviceLabel = services.find((s) => s.id === data.usluga)?.label ?? data.usluga;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">Sprawdź i wyślij</h2>
      <p className="text-text/60 text-sm mb-6">Upewnij się, że dane są prawidłowe.</p>

      {hasErrors && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          Formularz zawiera błędy. Wróć do odpowiednich kroków, aby je poprawić.
        </div>
      )}

      <dl className="space-y-3 rounded-xl border border-primary/10 bg-white p-5">
        <SummaryRow label="Usługa" value={serviceLabel} />
        <SummaryRow label="Opis" value={data.opis.trim()} />
        {data.zdjecia.length > 0 && (
          <SummaryRow label="Zdjęcia" value={`${data.zdjecia.length} plik(ów)`} />
        )}
        {data.wymiary.trim() && <SummaryRow label="Wymiary" value={data.wymiary.trim()} />}
        <SummaryRow label="Imię" value={data.imie.trim()} />
        <SummaryRow label="Telefon" value={data.telefon.trim()} />
        <SummaryRow label="E-mail" value={data.email.trim()} />
        {data.powiat && <SummaryRow label="Powiat" value={data.powiat} />}
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-primary/5 last:border-b-0">
      <dt className="text-xs font-medium text-text/50 uppercase tracking-wide sm:w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-text break-words">{value}</dd>
    </div>
  );
}
