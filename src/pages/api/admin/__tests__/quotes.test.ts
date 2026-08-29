import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('@/lib/db', () => ({
  getQuoteRequests: vi.fn(),
  getQuoteRequestsCount: vi.fn(),
  getQuoteById: vi.fn(),
  updateQuoteStatus: vi.fn(),
}));

// Mock admin-auth module
vi.mock('@/lib/admin-auth', () => ({
  isAuthenticated: vi.fn(),
}));

import { GET } from '../quotes';
import { PATCH } from '../quotes/[id]';
import { isAuthenticated } from '@/lib/admin-auth';
import { getQuoteRequests, getQuoteRequestsCount, getQuoteById, updateQuoteStatus } from '@/lib/db';

const mockIsAuthenticated = vi.mocked(isAuthenticated);
const mockGetQuoteRequests = vi.mocked(getQuoteRequests);
const mockGetQuoteRequestsCount = vi.mocked(getQuoteRequestsCount);
const mockGetQuoteById = vi.mocked(getQuoteById);
const mockUpdateQuoteStatus = vi.mocked(updateQuoteStatus);

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function createAstroContext(request: Request, params: Record<string, string> = {}) {
  return { request, params } as Parameters<typeof GET>[0];
}

describe('GET /api/admin/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak autentykacji', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const request = createRequest('http://localhost/api/admin/quotes');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Brak autoryzacji');
  });

  it('zwraca listę z paginacją przy domyślnych parametrach', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetQuoteRequests.mockResolvedValue([]);
    mockGetQuoteRequestsCount.mockResolvedValue(0);

    const request = createRequest('http://localhost/api/admin/quotes');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      quotes: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
    expect(mockGetQuoteRequests).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('respektuje parametry page i limit', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetQuoteRequests.mockResolvedValue([]);
    mockGetQuoteRequestsCount.mockResolvedValue(50);

    const request = createRequest('http://localhost/api/admin/quotes?page=3&limit=10');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(3);
    expect(body.totalPages).toBe(5);
    expect(mockGetQuoteRequests).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  it('ogranicza limit do MAX_LIMIT (100)', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetQuoteRequests.mockResolvedValue([]);
    mockGetQuoteRequestsCount.mockResolvedValue(0);

    const request = createRequest('http://localhost/api/admin/quotes?limit=500');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(200);
    expect(mockGetQuoteRequests).toHaveBeenCalledWith({ limit: 100, offset: 0 });
  });
});

describe('PATCH /api/admin/quotes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak autentykacji', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const request = createRequest('http://localhost/api/admin/quotes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'wycenione' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(401);
  });

  it('zwraca 400 przy nieprawidłowym ID', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/quotes/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'wycenione' }),
    });
    const response = await PATCH(createAstroContext(request, { id: 'abc' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Nieprawidłowe ID zapytania');
  });

  it('zwraca 400 przy nieprawidłowym statusie', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/quotes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Nieprawidłowy status');
  });

  it('zwraca 404 gdy zapytanie nie istnieje', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetQuoteById.mockResolvedValue(null);

    const request = createRequest('http://localhost/api/admin/quotes/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'wycenione' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '999' }));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Nie znaleziono zapytania wycenowego');
  });

  it('aktualizuje status poprawnie', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetQuoteById.mockResolvedValue({
      id: 1,
      usluga: 'taras',
      powierzchnia: 38,
      material: 'sosna',
      termin: 'asap',
      opis: null,
      telefon: '123456789',
      imie: 'Jan',
      email: 'jan@example.com',
      status: 'nowe',
      zdjecia: [],
      ip_address: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateQuoteStatus.mockResolvedValue(undefined);

    const request = createRequest('http://localhost/api/admin/quotes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'w trakcie' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, id: 1, status: 'w trakcie' });
    expect(mockUpdateQuoteStatus).toHaveBeenCalledWith(1, 'w trakcie');
  });

  it('zwraca 400 przy nieprawidłowym JSON', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/quotes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Nieprawidłowy format danych');
  });
});
