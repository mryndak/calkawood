import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('@/lib/db', () => ({
  getContactMessages: vi.fn(),
  getContactMessagesCount: vi.fn(),
  getContactMessageById: vi.fn(),
  updateContactStatus: vi.fn(),
}));

// Mock admin-auth module
vi.mock('@/lib/admin-auth', () => ({
  isAuthenticated: vi.fn(),
}));

import { GET } from '../messages';
import { PATCH } from '../messages/[id]';
import { isAuthenticated } from '@/lib/admin-auth';
import { getContactMessages, getContactMessagesCount, getContactMessageById, updateContactStatus } from '@/lib/db';

const mockIsAuthenticated = vi.mocked(isAuthenticated);
const mockGetContactMessages = vi.mocked(getContactMessages);
const mockGetContactMessagesCount = vi.mocked(getContactMessagesCount);
const mockGetContactMessageById = vi.mocked(getContactMessageById);
const mockUpdateContactStatus = vi.mocked(updateContactStatus);

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function createAstroContext(request: Request, params: Record<string, string> = {}) {
  return { request, params } as Parameters<typeof GET>[0];
}

describe('GET /api/admin/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak autentykacji', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const request = createRequest('http://localhost/api/admin/messages');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Brak autoryzacji');
  });

  it('zwraca listę z paginacją przy domyślnych parametrach', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetContactMessages.mockResolvedValue([]);
    mockGetContactMessagesCount.mockResolvedValue(0);

    const request = createRequest('http://localhost/api/admin/messages');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      messages: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
    expect(mockGetContactMessages).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('respektuje parametry page i limit', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetContactMessages.mockResolvedValue([]);
    mockGetContactMessagesCount.mockResolvedValue(50);

    const request = createRequest('http://localhost/api/admin/messages?page=3&limit=10');
    const response = await GET(createAstroContext(request));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(3);
    expect(body.totalPages).toBe(5);
    expect(mockGetContactMessages).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });
});

describe('PATCH /api/admin/messages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zwraca 401 gdy brak autentykacji', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const request = createRequest('http://localhost/api/admin/messages/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'odpowiedziano' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(401);
  });

  it('zwraca 400 przy nieprawidłowym ID', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/messages/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'odpowiedziano' }),
    });
    const response = await PATCH(createAstroContext(request, { id: 'abc' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Nieprawidłowe ID wiadomości');
  });

  it('zwraca 400 przy nieprawidłowym statusie', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/messages/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Nieprawidłowy status');
  });

  it('zwraca 404 gdy wiadomość nie istnieje', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetContactMessageById.mockResolvedValue(null);

    const request = createRequest('http://localhost/api/admin/messages/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'odpowiedziano' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '999' }));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Nie znaleziono wiadomości');
  });

  it('aktualizuje status poprawnie', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockGetContactMessageById.mockResolvedValue({
      id: 1,
      imie: 'Jan',
      telefon: '123456789',
      wiadomosc: 'Testowa wiadomość',
      status: 'nowa',
      ip_address: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdateContactStatus.mockResolvedValue(undefined);

    const request = createRequest('http://localhost/api/admin/messages/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'odpowiedziano' }),
    });
    const response = await PATCH(createAstroContext(request, { id: '1' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, id: 1, status: 'odpowiedziano' });
    expect(mockUpdateContactStatus).toHaveBeenCalledWith(1, 'odpowiedziano');
  });

  it('zwraca 400 przy nieprawidłowym JSON', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const request = createRequest('http://localhost/api/admin/messages/1', {
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
