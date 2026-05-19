/**
    Tests pure functions and API fetch helpers 
 *
 * Test suite covers all extractable pure/logic functions:
 *   - getMonthLabel
 *   - getMonthSortKey
 *   - getSeasonalQuarter
 *   - fetchAllAssets      (fetch mock — pagination logic)
 *   - fetchAllDepartments (fetch mock — pagination logic)
 *   - fetchAllLocations   (fetch mock — pagination logic)
 *
 * Industry standards followed:
 *   - AAA (Arrange / Act / Assert) pattern
 *   - Descriptive "should … when …" test naming
 *   - Isolated per-test mocks via beforeEach/afterEach
 *   - Boundary-value analysis for month/quarter edges
 *   - Pagination loop coverage (single page, multi-page, API error)
 */


const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Tests cover all 12 months, invalid dates, and ISO datetime strings with time components. (WC)
const getMonthLabel = (ds: string): string => {
  const d = new Date(ds);
  return isNaN(d.getTime()) ? ds : MONTH_NAMES[d.getMonth()];
};

// Tests cover single-digit month padding, two-digit months, sort order correctness via localeCompare, and invalid input fallback. (WC)
const getMonthSortKey = (ds: string): string => {
  const d = new Date(ds);
  return isNaN(d.getTime())
    ? ds
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Tests cover every quarter's boundary start and end, plus the tricky Q4 year-rollback rule (Jan/Feb belong to the previous year's Q4) (WC)
const getSeasonalQuarter = (date: Date): { quarter: number; year: number } => {
  const m = date.getMonth();
  const y = date.getFullYear();
  if (m >= 2 && m <= 4) return { quarter: 1, year: y };
  if (m >= 5 && m <= 7) return { quarter: 2, year: y };
  if (m >= 8 && m <= 10) return { quarter: 3, year: y };
  return { quarter: 4, year: m === 0 || m === 1 ? y - 1 : y };
};

// Tests cover single-page responses, multi-page accumulation, correct URL/page number on each call, HTTP error propagation such as 500, 403, 404.
// Missing data field fallback, and missing totalPages defaulting to 1 (to prevent infinite loops).  (WC)
async function fetchAllAssets(): Promise<any[]> {
  const PAGE_LIMIT = 50;
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    const res = await fetch(
      `/api/assets?page=${page}&limit=${PAGE_LIMIT}&sortBy=created_dt&sortOrder=asc`
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}
// Tests cover pagination logic, correct URL construction, data accumulation across pages, and error handling for non-ok responses. (WC)
async function fetchAllDepartments(): Promise<any[]> {
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    const res = await fetch(`/api/department`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}

// Tests cover pagination logic, correct URL construction, data accumulation across pages, and error handling for non-ok responses. (WC)
async function fetchAllLocations(): Promise<any[]> {
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    const res = await fetch(`/api/location`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}

// Test Suite
describe('getMonthLabel', () => {
  //  Converts a date string to a 3-letter month abbreviation.
  //  Returns the raw input unchanged for invalid dates.

  it.each([
    ['2024-01-15', 'Jan'],
    ['2024-02-15', 'Feb'],
    ['2024-03-15', 'Mar'],
    ['2024-04-15', 'Apr'],
    ['2024-05-15', 'May'],
    ['2024-06-15', 'Jun'],
    ['2024-07-15', 'Jul'],
    ['2024-08-15', 'Aug'],
    ['2024-09-15', 'Sep'],
    ['2024-10-15', 'Oct'],
    ['2024-11-15', 'Nov'],
    ['2024-12-15', 'Dec'],
  ])('should return "%s" for month of %s', (input, expected) => {
    expect(getMonthLabel(input)).toBe(expected);
  });

  it('should return the raw input string when the date is invalid', () => {
    // Arrange
    const input = 'not-a-date';

    // Act
    const result = getMonthLabel(input);

    // Assert
    expect(result).toBe(input);
  });

  it('should handle an ISO datetime string with time component', () => {
    // Arrange: time part must not affect the month
    const input = '2024-09-25T14:30:00Z';

    // Act & Assert
    expect(getMonthLabel(input)).toBe('Sep');
  });
});

describe('getMonthSortKey', () => {
    // Produces a zero-padded "YYYY-MM" string suitable for lexicographic sorting.

  it('should return "YYYY-MM" with zero-padded single-digit months', () => {
    // Arrange
    const input = '2024-03-15'; // March: 03

    // Act
    const result = getMonthSortKey(input);

    // Assert
    expect(result).toBe('2024-03');
  });

  it('should return "YYYY-MM" with two-digit months without extra padding', () => {
    // Arrange
    const input = '2024-11-01'; // November: 11

    // Act
    const result = getMonthSortKey(input);

    // Assert
    expect(result).toBe('2024-11');
  });

  it('should produce keys that sort chronologically via localeCompare', () => {
    // Arrange
    const keys = ['2024-03', '2023-12', '2024-01'].map(m => getMonthSortKey(`${m}-01`));

    // Act
    const sorted = [...keys].sort((a, b) => a.localeCompare(b));

    // Assert
    expect(sorted).toEqual(['2023-12', '2024-01', '2024-03']);
  });

  it('should return the raw string for an invalid date', () => {
    // Arrange
    const input = 'bad-date';

    // Act & Assert
    expect(getMonthSortKey(input)).toBe(input);
  });
});

describe('getSeasonalQuarter', () => {
  /**
   * Fiscal quarter mapping (custom, not calendar-standard):
   *   Q1 = Mar–May  (months 2–4)
   *   Q2 = Jun–Aug  (months 5–7)
   *   Q3 = Sep–Nov  (months 8–10)
   *   Q4 = Dec–Feb  (months 11, 0, 1)
   *
   * For Q4, December belongs to the CURRENT year's Q4,
   * while Jan–Feb belong to the PREVIOUS year's Q4.
   */

  // Tests cover boundary months for each quarter, plus the special Q4 year-rollback rule for Jan/Feb. (WC)
  it('should return Q1 for March (month boundary start)', () => {
    expect(getSeasonalQuarter(new Date(2024, 2, 1))).toEqual({ quarter: 1, year: 2024 });
  });

  it('should return Q1 for April (mid-quarter)', () => {
    expect(getSeasonalQuarter(new Date(2024, 3, 15))).toEqual({ quarter: 1, year: 2024 });
  });

  it('should return Q1 for May (month boundary end)', () => {
    expect(getSeasonalQuarter(new Date(2024, 4, 31))).toEqual({ quarter: 1, year: 2024 });
  });

  // Q2 boundary tests 
  it('should return Q2 for June (month boundary start)', () => {
    expect(getSeasonalQuarter(new Date(2024, 5, 1))).toEqual({ quarter: 2, year: 2024 });
  });

  it('should return Q2 for August (month boundary end)', () => {
    expect(getSeasonalQuarter(new Date(2024, 7, 31))).toEqual({ quarter: 2, year: 2024 });
  });

  // Q3 boundary tests 
  it('should return Q3 for September (month boundary start)', () => {
    expect(getSeasonalQuarter(new Date(2024, 8, 1))).toEqual({ quarter: 3, year: 2024 });
  });

  it('should return Q3 for November (month boundary end)', () => {
    expect(getSeasonalQuarter(new Date(2024, 10, 30))).toEqual({ quarter: 3, year: 2024 });
  });

  // Q4 boundary tests
  it('should return Q4 for December with the CURRENT year', () => {
    // December belongs to the same year's Q4 (e.g. Dec 2024 → 2024-Q4)
    expect(getSeasonalQuarter(new Date(2024, 11, 1))).toEqual({ quarter: 4, year: 2024 });
  });

  it('should return Q4 for January with the PREVIOUS year', () => {
    // January 2025 belongs to 2024-Q4
    expect(getSeasonalQuarter(new Date(2025, 0, 15))).toEqual({ quarter: 4, year: 2024 });
  });

  it('should return Q4 for February with the PREVIOUS year', () => {
    // February 2025 belongs to 2024-Q4
    expect(getSeasonalQuarter(new Date(2025, 1, 28))).toEqual({ quarter: 4, year: 2024 });
  });
});


describe('fetchAllAssets', () => {
  /**
   * fetchAllAssets paginates through /api/assets using the totalPages field.
   * Tests verify correct URL construction, pagination loop, data accumulation,
   * and error propagation.
   */

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should request the correct URL including sort parameters on the first page', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], totalPages: 1 }),
    } as unknown as Response);

    // Act
    await fetchAllAssets();

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/assets?page=1&limit=50&sortBy=created_dt&sortOrder=asc'
    );
  });

  it('should return all assets from a single-page response', async () => {
    // Arrange
    const mockAssets = [{ asset_id: 'A1' }, { asset_id: 'A2' }];
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAssets, totalPages: 1 }),
    } as unknown as Response);

    // Act
    const result = await fetchAllAssets();

    // Assert
    expect(result).toEqual(mockAssets);
  });

  it('should accumulate assets across multiple pages', async () => {
    // Arrange: 2-page response
    const page1 = [{ asset_id: 'A1' }, { asset_id: 'A2' }];
    const page2 = [{ asset_id: 'A3' }];
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: page1, totalPages: 2 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: page2, totalPages: 2 }),
      } as unknown as Response);

    // Act
    const result = await fetchAllAssets();

    // Assert
    expect(result).toEqual([...page1, ...page2]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch the correct page number on subsequent pages', async () => {
    // Arrange
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ asset_id: 'A1' }], totalPages: 2 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ asset_id: 'A2' }], totalPages: 2 }),
      } as unknown as Response);

    // Act
    await fetchAllAssets();

    // Assert: second call should have page=2
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/assets?page=2&limit=50&sortBy=created_dt&sortOrder=asc'
    );
  });

  it('should throw an error when the API returns a non-ok response', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);

    // Act & Assert
    await expect(fetchAllAssets()).rejects.toThrow('API error: 500');
  });

  it('should handle a response with missing data field by returning empty array', async () => {
    // Arrange: API omits the "data" key entirely
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalPages: 1 }),
    } as unknown as Response);

    // Act
    const result = await fetchAllAssets();

    // Assert
    expect(result).toEqual([]);
  });

  it('should default totalPages to 1 when it is missing from the response', async () => {
    // Arrange: no totalPages field; loop must not run infinitely
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ asset_id: 'A1' }] }), // totalPages missing
    } as unknown as Response);

    // Act
    const result = await fetchAllAssets();

    // Assert: only one page fetched
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ asset_id: 'A1' }]);
  });
});

// Tests for fetchAllDepartments and fetchAllLocations would be similar in structure to fetchAllAssets, 
// covering pagination, URL correctness, data accumulation, and error handling. (WC)
describe('fetchAllDepartments', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should fetch from /api/department', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], totalPages: 1 }),
    } as unknown as Response);

    // Act
    await fetchAllDepartments();

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/department');
  });

  it('should return all departments from a single-page response', async () => {
    // Arrange
    const mockDepts = [{ department_id: 'D1', name: 'Engineering' }];
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockDepts, totalPages: 1 }),
    } as unknown as Response);

    // Act
    const result = await fetchAllDepartments();

    // Assert
    expect(result).toEqual(mockDepts);
  });

  it('should accumulate departments across multiple pages', async () => {
    // Arrange
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ department_id: 'D1', name: 'Engineering' }],
          totalPages: 2,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ department_id: 'D2', name: 'Operations' }],
          totalPages: 2,
        }),
      } as unknown as Response);

    // Act
    const result = await fetchAllDepartments();

    // Assert
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Operations');
  });

  it('should throw when the API returns a non-ok status', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as unknown as Response);

    // Act & Assert
    await expect(fetchAllDepartments()).rejects.toThrow('API error: 403');
  });
});

// Tests for fetchAllLocations would be nearly identical to fetchAllDepartments, just with the URL and mock data structure changed. (WC)
describe('fetchAllLocations', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should fetch from /api/location', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], totalPages: 1 }),
    } as unknown as Response);

    // Act
    await fetchAllLocations();

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/location');
  });

  it('should return all locations from a single-page response', async () => {
    // Arrange
    const mockLocs = [{ location_id: 'L1', name: 'Warehouse A' }];
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockLocs, totalPages: 1 }),
    } as unknown as Response);

    // Act
    const result = await fetchAllLocations();

    // Assert
    expect(result).toEqual(mockLocs);
  });

  it('should accumulate locations across multiple pages', async () => {
    // Arrange
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ location_id: 'L1', name: 'Warehouse A' }],
          totalPages: 2,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ location_id: 'L2', name: 'Warehouse B' }],
          totalPages: 2,
        }),
      } as unknown as Response);

    // Act
    const result = await fetchAllLocations();

    // Assert
    expect(result).toHaveLength(2);
  });

  it('should throw when the API returns a non-ok status', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    // Act & Assert
    await expect(fetchAllLocations()).rejects.toThrow('API error: 404');
  });

  it('should handle a missing data field by returning an empty array', async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalPages: 1 }), // no data key
    } as unknown as Response);

    // Act
    const result = await fetchAllLocations();

    // Assert
    expect(result).toEqual([]);
  });
});
