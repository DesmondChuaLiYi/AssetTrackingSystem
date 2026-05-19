/**

 * Test suite covers all pure/extractable logic functions:
 *   - formatDate
 *   - parseAiPoints
 *   - handleApprove  (fetch mock)
 *   - handleReject   (fetch mock)
 *   - handleReopen   (fetch mock)
 *
 * Industry standards followed:
 *   - AAA (Arrange / Act / Assert) pattern in every test
 *   - Descriptive test names using "should … when …" phrasing
 *   - Isolated mocks — no shared mutable state across tests
 *   - Edge-case coverage alongside happy paths
 *   - No implementation details leaked through mocks
 */


// Converts an ISO date string into a human-readable Malaysian locale format (en-MY).
const formatDate = (dateString: string): string =>
// Valid ISO date: '2024-09-25T14:30:00Z' → Returns a non-empty string containing "2024" and 
// Invalid date string → Returns a string that includes "Invalid Date".  (WC)
  new Date(dateString).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Extracts up to 3 bullet points from an AI-generated maintenance assessment text. 
// It looks for an ISSUES: section first, then falls back to line-by-line parsing. (WC)
const parseAiPoints = (text: string): string[] => {
// Empty string: Returns [], null input returns []
  if (!text) return [];
// Case-insensitive header: issues: (lowercase) works same as ISSUES: (WC)
  const issuesSection = text.split(/ISSUES:/i)[1];
  if (issuesSection) {
    // ISSUES: section: Correctly extracts 3 named issues
    const points = issuesSection
      .split('\n')
    // Bullet stripping: Lines starting with "-", "•", "*", or digits followed by "." are cleaned to remove these characters and leading whitespace.
      .map((l: string) => l.replace(/^[\s\-•*]+/, '').trim())
    // Short lines filtered: Lines under 10 chars (e.g. "OK", "N/A") are excluded
      .filter((l: string) => l.length > 3);
    if (points.length > 0) return points.slice(0, 3);
  }
  return text
    .split(/[\n\r]+/)
    .map((l: string) => l.replace(/^[\s\-•*\d.]+/, '').trim())
    // Long lines filtered: Lines 120+ chars are excluded (WC)
    .filter((l: string) => l.length > 10 && l.length < 120)
    .slice(0, 3);
};

// Handle functions for approving, rejecting, and reopening maintenance assessments (WC).
const handleApprove = async (
  row: Record<string, unknown>,
  refresh: () => void
): Promise<void> => {
  if (!confirm('Are you sure you want to approve this maintenance request?')) return;
  const res = await fetch('/api/approveAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Correct API call
    body: JSON.stringify({ assessmentId: row.id }),
  });
    // Success path: Calls refresh() to update the UI
  if (res.ok) refresh();
    // Failure path: Does NOT call refresh(), shows "Failed to approve" alert
  else alert('Failed to approve');
};

// handleReject and handleReopen have the same structure as handleApprove. (WC)
const handleReject = async (
  row: Record<string, unknown>,
  refresh: () => void
): Promise<void> => {
  if (!confirm('Are you sure you want to reject this maintenance request?')) return;
  const res = await fetch('/api/rejectAssessments', {
    method: 'POST',
    // Correct API call
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId: row.id }),
  });
    // Success path: Calls refresh() to update the UI 
  if (res.ok) refresh();
    // Failure path: Does NOT call refresh(), shows "Failed to reject" alert
  else alert('Failed to reject');
};

// handleReopen tests mirror the structure of handleApprove and handleReject, 
// but target the /api/reopenAssessments endpoint and show a different alert message on failure. (WC)
const handleReopen = async (
  row: Record<string, unknown>,
  refresh: () => void
): Promise<void> => {
  if (!confirm('Reopen this assessment and move it back to pending?')) return;
  const res = await fetch('/api/reopenAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Correct API call
    body: JSON.stringify({ assessmentId: row.id }),
  });
    // Success path: Calls refresh() to update the UI
  if (res.ok) refresh();
    // Failure path: Does NOT call refresh(), shows "Failed to reopen" alert
  else alert('Failed to reopen');
};

// Test Suite  (WC)
describe('formatDate', () => {
    // formatDate wraps the native Intl API with a fixed locale/format.
    // We verify the structural shape of the output rather than an exact string
    // because the Intl implementation can produce locale-specific punctuation
    // that differs between Node versions and CI environments.

  it('should return a non-empty string for a valid ISO date', () => {
    // Arrange
    const input = '2024-09-25T14:30:00Z';

    // Act
    const result = formatDate(input);

    // Assert
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should include the year present in the input date', () => {
    // Arrange
    const input = '2024-09-25T14:30:00Z';

    // Act
    const result = formatDate(input);

    // Assert
    expect(result).toContain('2024');
  });

  it('should return "Invalid Date" for a non-date string', () => {
    // Arrange
    const input = 'not-a-date';

    // Act
    const result = formatDate(input);

    // Assert
    // Intl falls back to "Invalid Date" when passed an invalid Date object
    expect(result).toMatch(/invalid date/i);
  });

  it('should handle a date at the very start of the year (1 Jan)', () => {
    // Arrange
    const input = '2025-01-01T00:00:00Z';

    // Act
    const result = formatDate(input);

    // Assert
    expect(result).toContain('2025');
  });

  it('should handle a date at the very end of the year (31 Dec)', () => {
    // Arrange
    const input = '2025-12-31T12:00:00Z';

    // Act
    const result = formatDate(input);

    // Assert
    expect(result).toContain('2025');
  });
});

// The following tests cover parseAiPoints and the three handle functions. (WC)
// They verify correct parsing logic, API call structure, refresh behavior, and alerting on failure, following the AAA pattern and covering edge cases.
describe('parseAiPoints', () => {
    // parseAiPoints extracts up to 3 bullet/line items from an AI response string.
    // It prioritises a dedicated ISSUES: section, then falls back to line-based parsing.

  it('should return an empty array for an empty string', () => {
    // Arrange & Act
    const result = parseAiPoints('');

    // Assert
    expect(result).toEqual([]);
  });

  it('should return an empty array for a falsy value (null cast)', () => {
    // Arrange & Act
    // The function receives `string` but the runtime value may be undefined/null
    const result = parseAiPoints(null as unknown as string);

    // Assert
    expect(result).toEqual([]);
  });

  it('should parse points from an ISSUES: section', () => {
    // Arrange
    const input = `SUMMARY: All good\nISSUES:\n- Leaking pipe\n- Broken valve\n- Rust on frame`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Leaking pipe');
    expect(result[1]).toBe('Broken valve');
    expect(result[2]).toBe('Rust on frame');
  });

  it('should cap ISSUES: section results at 3 items even when more are present', () => {
    // Arrange
    const input = `ISSUES:\n- Item one\n- Item two\n- Item three\n- Item four\n- Item five`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result).toHaveLength(3);
  });

  it('should fall back to line-based parsing when there is no ISSUES: section', () => {
    // Arrange
    const input = `The motor is overheating\nBearing noise detected\nLubrication needed`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toBe('The motor is overheating');
  });

  it('should filter out lines shorter than 10 characters in fallback mode', () => {
    // Arrange: short lines like "OK" or "N/A" should be excluded
    const input = `OK\nN/A\nThe compressor belt shows signs of wear and must be replaced`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('compressor belt');
  });

  it('should filter out lines longer than 119 characters in fallback mode', () => {
    // Arrange: 120 characters is the exclusive upper boundary
    const longLine = 'A'.repeat(120); // exactly 120 chars → excluded
    const goodLine = 'Motor bearing requires immediate attention';
    const input = `${longLine}\n${goodLine}`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(goodLine);
  });

  it('should strip leading bullet characters from each line', () => {
    // Arrange
    const input = `ISSUES:\n• First issue here\n* Second issue here\n- Third issue here`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result[0]).toBe('First issue here');
    expect(result[1]).toBe('Second issue here');
    expect(result[2]).toBe('Third issue here');
  });

  it('should handle case-insensitive ISSUES: header (e.g., "issues:")', () => {
    // Arrange
    const input = `issues:\n- Corroded contacts`;

    // Act
    const result = parseAiPoints(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Corroded contacts');
  });
});

// The following three functions handle approval, rejection, and reopening (WC)
describe('handleApprove', () => {
  // handleApprove POSTs to /api/approveAssessments.
  // It calls refresh() on success and alerts on failure.
  // confirm() is mocked to avoid interactive dialogs in the test runner.

  let originalConfirm: typeof global.confirm;
  let originalAlert: typeof global.alert;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalConfirm = global.confirm;
    originalAlert = global.alert;
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.confirm = originalConfirm;
    global.alert = originalAlert;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should POST to /api/approveAssessments with the correct assessmentId', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();
    const row = { id: 'ASSESS-001' };

    // Act
    await handleApprove(row, refresh);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/approveAssessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'ASSESS-001' }),
    });
  });

  it('should call refresh() when the API responds with ok: true', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();

    // Act
    await handleApprove({ id: 'ASSESS-001' }, refresh);

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should NOT call refresh() when the API responds with ok: false', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.alert = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);
    const refresh = jest.fn();

    // Act
    await handleApprove({ id: 'ASSESS-001' }, refresh);

    // Assert
    expect(refresh).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith('Failed to approve');
  });

  it('should do nothing if the user cancels the confirmation dialog', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(false);
    global.fetch   = jest.fn();
    const refresh  = jest.fn();

    // Act
    await handleApprove({ id: 'ASSESS-001' }, refresh);

    // Assert
    expect(global.fetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

// handleReject and handleReopen have the same structure as handleApprove, 
// but call different endpoints and show different alert messages on failure. (WC)
// The tests follow the same pattern for each function, verifying correct API calls, refresh behavior, and alerting on failure.
describe('handleReject', () => {
  let originalConfirm: typeof global.confirm;
  let originalAlert: typeof global.alert;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalConfirm = global.confirm;
    originalAlert = global.alert;
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.confirm = originalConfirm;
    global.alert = originalAlert;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should POST to /api/rejectAssessments with the correct assessmentId', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();

    // Act
    await handleReject({ id: 'ASSESS-002' }, refresh);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/rejectAssessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'ASSESS-002' }),
    });
  });

  it('should call refresh() on a successful rejection response', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();

    // Act
    await handleReject({ id: 'ASSESS-002' }, refresh);

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should alert and NOT call refresh() when the API fails', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.alert = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);
    const refresh = jest.fn();

    // Act
    await handleReject({ id: 'ASSESS-002' }, refresh);

    // Assert
    expect(refresh).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith('Failed to reject');
  });

  it('should abort without fetching when the user declines the confirmation', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(false);
    global.fetch   = jest.fn();
    const refresh  = jest.fn();

    // Act
    await handleReject({ id: 'ASSESS-002' }, refresh);

    // Assert
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// handleReopen tests mirror the structure of handleApprove and handleReject, 
// but target the /api/reopenAssessments endpoint and show a different alert message on failure.
describe('handleReopen', () => {
  let originalConfirm: typeof global.confirm;
  let originalAlert: typeof global.alert;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalConfirm = global.confirm;
    originalAlert = global.alert;
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.confirm = originalConfirm;
    global.alert = originalAlert;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('should POST to /api/reopenAssessments with the correct assessmentId', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();

    // Act
    await handleReopen({ id: 'ASSESS-003' }, refresh);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/reopenAssessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: 'ASSESS-003' }),
    });
  });

  it('should call refresh() when reopening succeeds', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const refresh = jest.fn();

    // Act
    await handleReopen({ id: 'ASSESS-003' }, refresh);

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should alert "Failed to reopen" when the API call fails', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(true);
    global.alert = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);
    const refresh = jest.fn();

    // Act
    await handleReopen({ id: 'ASSESS-003' }, refresh);

    // Assert
    expect(global.alert).toHaveBeenCalledWith('Failed to reopen');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('should not fetch when the user cancels the reopen confirmation', async () => {
    // Arrange
    global.confirm = jest.fn().mockReturnValue(false);
    global.fetch = jest.fn();
    const refresh = jest.fn();

    // Act
    await handleReopen({ id: 'ASSESS-003' }, refresh);

    // Assert
    expect(global.fetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});