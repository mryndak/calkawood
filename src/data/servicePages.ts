import type { EstimateService } from '@/lib/estimate';

// Kategorie realizacji/oferty (src/content.config.ts, /realizacje) — osobna
// taksonomia od kategorii kreatora wyceny (EstimateService w estimate.ts),
// gdzie "sauny"→"sauna" i "zadaszenia"→"zadaszenie" są w liczbie pojedynczej.
export type ServiceCategory = 'domy' | 'sauny' | 'tarasy' | 'zadaszenia' | 'wnetrza';

export interface ServiceHighlight {
  title: string;
  description: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServicePageContent {
  slug: ServiceCategory;
  estimateKey: EstimateService;
  kicker: string;
  h1: string;
  intro: string;
  highlights: ServiceHighlight[];
  faq: ServiceFaq[];
}

export const SERVICE_PAGES: Record<ServiceCategory, ServicePageContent> = {
  domy: {
    slug: 'domy',
    estimateKey: 'domy',
    kicker: 'Domy drewniane',
    h1: 'Domy drewniane na Podkarpaciu — szkieletowe i z bali',
    intro:
      'Budujemy domy jednorodzinne i letniskowe w dwóch technologiach: szkieletowej (kanadyjskiej) i z bali. ' +
      'Prowadzimy inwestycję od pomiaru i projektu, przez konstrukcję i dach, po elewację i wykończenie wnętrza — jedna ekipa, jeden kontakt przez cały proces.',
    highlights: [
      {
        title: 'Konstrukcja szkieletowa',
        description: 'Energooszczędna, szybka w budowie technologia kanadyjska — stan surowy zamknięty zwykle w kilka miesięcy.',
      },
      {
        title: 'Dom z bali',
        description: 'Tradycyjna konstrukcja z drewna litego lub klejonego, dla inwestorów zależących na naturalnym, masywnym wyglądzie.',
      },
      {
        title: 'Pod klucz lub stan surowy',
        description: 'Decydujesz, na jakim etapie przejmujesz budowę — dokańczamy dach, elewację i wnętrze według potrzeb.',
      },
      {
        title: 'Domy letniskowe',
        description: 'Mniejsze metraże, budynki gospodarcze i domki rekreacyjne budowane na tej samej zasadzie co domy całoroczne.',
      },
    ],
    faq: [
      {
        question: 'Ile trwa budowa domu szkieletowego?',
        answer: 'Zwykle 4–7 miesięcy do stanu surowego zamkniętego, zależnie od metrażu i pory roku. Dokładny harmonogram ustalamy po pomiarze.',
      },
      {
        question: 'Czy budujecie na moim projekcie, czy trzeba mieć własny?',
        answer: 'Możemy pracować na gotowym projekcie architektonicznym albo pomóc dobrać rozwiązania konstrukcyjne — pierwsza rozmowa wyjaśnia, co już masz, a czego jeszcze potrzeba.',
      },
    ],
  },
  sauny: {
    slug: 'sauny',
    estimateKey: 'sauna',
    kicker: 'Sauny',
    h1: 'Sauny ogrodowe i wnętrzowe na wymiar',
    intro:
      'Budujemy sauny fińskie, sauny typu barrel (beczka) i sauny wnętrzowe — od małej kabiny przy łazience po wolnostojący budynek w ogrodzie. ' +
      'Dobieramy drewno i piec do wielkości pomieszczenia i sposobu użytkowania.',
    highlights: [
      {
        title: 'Sauna ogrodowa',
        description: 'Wolnostojący, izolowany budynek przygotowany do całorocznego użytkowania.',
      },
      {
        title: 'Sauna typu barrel',
        description: 'Kompaktowa forma beczki — mniej miejsca, szybszy montaż, charakterystyczny wygląd.',
      },
      {
        title: 'Sauna wnętrzowa',
        description: 'Zabudowa w istniejącym pomieszczeniu — łazience, piwnicy, garażu.',
      },
      {
        title: 'Dobór drewna',
        description: 'Cedr, świerk skandynawski czy olcha — dobieramy materiał odporny na wilgoć i wysoką temperaturę.',
      },
    ],
    faq: [
      {
        question: 'Jak długo trwa montaż sauny ogrodowej?',
        answer: 'Sauna typu barrel to zwykle kilka dni montażu po dostawie elementów. Sauna budowana od podstaw w ogrodzie — kilka tygodni, zależnie od wielkości i fundamentu.',
      },
      {
        question: 'Czy sauna ogrodowa wymaga pozwolenia na budowę?',
        answer: 'Małe sauny ogrodowe zwykle mieszczą się w zgłoszeniu albo nie wymagają formalności — sprawdzamy to indywidualnie przy wycenie, zależnie od gminy i powierzchni.',
      },
    ],
  },
  tarasy: {
    slug: 'tarasy',
    estimateKey: 'taras',
    kicker: 'Tarasy',
    h1: 'Tarasy drewniane i kompozytowe — Podkarpacie',
    intro:
      'Budujemy tarasy z drewna (sosna, modrzew syberyjski, dąb) i kompozytu WPC, na konstrukcji drewnianej lub stalowej. ' +
      'Od małego tarasu wejściowego po wielopoziomowe tarasy prowadzone wokół całego domu.',
    highlights: [
      {
        title: 'Deska drewniana',
        description: 'Modrzew syberyjski, sosna olejowana lub dąb — naturalny wygląd, wymaga okresowej konserwacji.',
      },
      {
        title: 'Kompozyt WPC',
        description: 'Stabilny kolor bez olejowania — dobry wybór, gdy zależy Ci na minimalnej konserwacji.',
      },
      {
        title: 'Balustrady i schody',
        description: 'Listwowe, szklane lub linkowe — dopasowane do stylu tarasu i domu.',
      },
      {
        title: 'Tarasy dwupoziomowe i narożne',
        description: 'Prowadzimy konstrukcję wokół nieregularnych rzutów domu, także wokół jacuzzi czy basenu.',
      },
    ],
    faq: [
      {
        question: 'Który materiał tarasu wybrać — drewno czy kompozyt?',
        answer: 'Drewno (modrzew, dąb) wygląda najbardziej naturalnie, ale wymaga olejowania co 1–2 lata. Kompozyt nie wymaga konserwacji i dłużej zachowuje kolor, kosztem bardziej jednolitego wyglądu.',
      },
      {
        question: 'Ile kosztuje budowa tarasu?',
        answer: 'Orientacyjnie od 520 zł/m², zależnie od materiału i konstrukcji. Dokładną wycenę dla Twojej powierzchni i materiału dostaniesz w kreatorze wyceny online w kilka minut.',
      },
    ],
  },
  zadaszenia: {
    slug: 'zadaszenia',
    estimateKey: 'zadaszenie',
    kicker: 'Altany i zadaszenia',
    h1: 'Altany ogrodowe, zadaszenia i pergole na wymiar',
    intro:
      'Altany ogrodowe, zadaszenia tarasów, pergole przy elewacji i wiaty — konstrukcje z drewna klejonego lub litego, kryte poliwęglanem, ' +
      'blachodachówką lub gontem, dopasowane do istniejącego domu i ogrodu.',
    highlights: [
      {
        title: 'Altana ogrodowa',
        description: 'Samodzielny obiekt w ogrodzie — miejsce na grilla, spotkania rodzinne, drugi salon na zewnątrz.',
      },
      {
        title: 'Zadaszenie tarasu',
        description: 'Osłona przed deszczem i słońcem — wolnostojąca albo oparta o ścianę domu.',
      },
      {
        title: 'Pergola przy elewacji',
        description: 'Lekka konstrukcja wsparta na słupach, często łączona z roletami zewnętrznymi.',
      },
      {
        title: 'Podcienie i wiaty',
        description: 'Zadaszone przejścia i miejsca postojowe, dopasowane konstrukcyjnie do reszty budynku.',
      },
    ],
    faq: [
      {
        question: 'Z czego budujecie altany ogrodowe?',
        answer: 'Najczęściej z drewna świerkowego lub sosnowego, w konstrukcji szkieletowej z zadaszeniem dopasowanym do reszty ogrodu — od prostej wiaty po zamkniętą altanę z oknami.',
      },
      {
        question: 'Jakie pokrycie dachu wybrać do altany lub zadaszenia tarasu?',
        answer: 'Poliwęglan komorowy przepuszcza światło i jest najtańszy. Blachodachówka i gont dają pełne zacienienie i pasują wyglądem do dachu domu.',
      },
      {
        question: 'Ile kosztuje altana lub zadaszenie tarasu?',
        answer: 'Orientacyjnie od 680 zł/m², zależnie od konstrukcji i pokrycia dachu. Dokładne widełki cenowe policzysz w kreatorze wyceny online.',
      },
    ],
  },
  wnetrza: {
    slug: 'wnetrza',
    estimateKey: 'wnetrza',
    kicker: 'Podłogi i wnętrza',
    h1: 'Podłogi drewniane, panele i remonty wnętrz',
    intro:
      'Układanie desek podłogowych i paneli, budowa schodów drewnianych, drobne remonty i zabudowy stolarskie wewnątrz domu — ' +
      'tam, gdzie kończy się konstrukcja, a zaczyna wykończenie.',
    highlights: [
      {
        title: 'Podłogi drewniane i panele',
        description: 'Układanie na starym podłożu lub od podstawy, z dopasowaniem listew przypodłogowych i progów.',
      },
      {
        title: 'Schody drewniane',
        description: 'Konstrukcja i okładziny schodów wewnętrznych, dopasowane do stylu wnętrza.',
      },
      {
        title: 'Zabudowy stolarskie',
        description: 'Szafy, antresole i inne elementy na wymiar, wykonane z tego samego drewna co reszta wykończenia.',
      },
      {
        title: 'Drobne remonty',
        description: 'Prace wykończeniowe zlecane razem z inną usługą (np. po budowie tarasu czy domu) albo osobno.',
      },
    ],
    faq: [
      {
        question: 'Czy układacie podłogi bez wcześniejszej budowy domu przez Was?',
        answer: 'Tak, podłogi, panele i schody wykonujemy też jako osobne zlecenie, niezależnie od tego, kto budował dom.',
      },
      {
        question: 'Ile kosztuje ułożenie podłogi drewnianej?',
        answer: 'Orientacyjnie od 420 zł/m², zależnie od materiału i stanu podłoża. Dokładną wycenę policzysz w kreatorze online.',
      },
    ],
  },
};

export const SERVICE_CATEGORY_ORDER: ServiceCategory[] = ['domy', 'sauny', 'tarasy', 'zadaszenia', 'wnetrza'];
