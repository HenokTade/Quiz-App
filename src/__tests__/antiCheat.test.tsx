/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Quiz from '../pages/Quiz';
import QuizCooldown from '../pages/QuizCooldown';
import Admin from '../pages/Admin';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(async () => ({})),
  onSnapshotCb: null as null | ((snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void),
}));

vi.mock('../lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => {
  const categoryData = {
    name: 'Math',
    locked: false,
    maxViolations: 0,
    quizTime: 5,
    retakeMode: 'unlimited',
    feedbackMode: 'at_end',
    shuffleQuestions: false,
  };
  const question = {
    question: 'What is 1 + 1?',
    options: ['2', '3'],
    correctAnswer: 0,
    explanation: 'Basic addition',
    category: 'cat1',
    createdAt: 1,
  };
  return {
    doc: vi.fn((_db: unknown, col: string, id: string) => ({ __doc: `${col}/${id}` })),
    collection: vi.fn((_db: unknown, name: string) => ({ __col: name })),
    query: vi.fn((...args: unknown[]) => ({ __query: args })),
    where: vi.fn((...args: unknown[]) => ({ __where: args })),
    orderBy: vi.fn((...args: unknown[]) => ({ __orderBy: args })),
    limit: vi.fn((...args: unknown[]) => ({ __limit: args })),
    getDoc: vi.fn(async () => ({ exists: () => true, data: () => categoryData })),
    getDocs: vi.fn(async (q: { __col?: string; __query?: unknown[] }) => {
      if (q?.__col === 'users' || q?.__col === 'results') return { docs: [] };
      return { docs: [{ id: 'q1', data: () => question }] };
    }),
    addDoc: mocks.addDoc,
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    onSnapshot: vi.fn((_q: unknown, cb: (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void) => {
      mocks.onSnapshotCb = cb;
      return () => {};
    }),
  };
});

const alertMock = vi.fn();
(window as unknown as { alert: typeof alertMock }).alert = alertMock;

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
}

function dispatchVisibility(state: 'visible' | 'hidden') {
  setVisibility(state);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function renderQuiz() {
  return render(
    <MemoryRouter initialEntries={['/quiz/cat1']}>
      <Routes>
        <Route path="/quiz/:categoryId" element={<Quiz />} />
        <Route path="/results" element={<div>Results Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderQuizAndWait() {
  const view = renderQuiz();
  await screen.findByText(/Question 1 of 1/);
  return view;
}

beforeEach(() => {
  alertMock.mockClear();
  mocks.addDoc.mockClear();
  mocks.onSnapshotCb = null;
  useStore.setState({
    user: { uid: 'u1', email: 'student@test.com', role: 'student', displayName: 'Student One' },
    tabViolations: 0,
    quizViolationLimit: 0,
    quizFinished: false,
    quizStartTime: 0,
    quizTime: 0,
    currentCategoryId: '',
    currentCategoryName: '',
    currentQuiz: [],
    currentQuestionIndex: 0,
    quizAnswers: [],
    bookmarkedQuestions: [],
    resultSaved: false,
  });
});

afterEach(() => {
  cleanup();
  delete (document as unknown as Record<string, unknown>).visibilityState;
  delete (document as unknown as Record<string, unknown>).hidden;
});

describe('Quiz anti-cheat: mobile navigation bar / tab switch', () => {
  it('blacks out the screen instantly when the page becomes hidden', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');

    const warning = await screen.findByText('Tab Switch Detected');
    const overlay = warning.closest('.fixed') as HTMLElement;
    expect(overlay.style.visibility).toBe('visible');
    expect(overlay.style.background || '').toContain('0');
  });

  it('records the violation in the store and reports it to Firestore', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');

    await waitFor(() => expect(useStore.getState().tabViolations).toBe(1));
    expect(mocks.addDoc).toHaveBeenCalledTimes(1);
    expect(mocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'u1',
        userName: 'Student One',
        type: 'tab_switch',
        violationCount: 1,
        categoryName: 'Math',
      })
    );
  });

  it('alerts the user with a native warning when they return to the tab', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');
    await screen.findByText('Tab Switch Detected');
    expect(alertMock).not.toHaveBeenCalled();

    dispatchVisibility('visible');

    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(String(alertMock.mock.calls[0][0])).toContain('Warning #1');
    expect(String(alertMock.mock.calls[0][0])).toContain('left the quiz tab');
  });

  it('dismisses the blackout when Return to Quiz is clicked', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');
    const warning = await screen.findByText('Tab Switch Detected');
    const overlay = warning.closest('.fixed') as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: 'Return to Quiz' }));

    await waitFor(() => expect(screen.queryByText('Tab Switch Detected')).toBeNull());
    expect(overlay.style.visibility).toBe('hidden');
    expect(screen.getByText(/Question 1 of 1/)).toBeTruthy();
  });

  it('records a violation on window blur while the tab is still visible', async () => {
    await renderQuizAndWait();

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    await waitFor(() => expect(useStore.getState().tabViolations).toBe(1));
    await screen.findByText('Tab Switch Detected');
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(mocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'tab_switch', violationCount: 1 })
    );
  });

  it('records a violation on pagehide (app switch / leaving the page)', async () => {
    await renderQuizAndWait();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => expect(useStore.getState().tabViolations).toBe(1));
    expect(mocks.addDoc).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid duplicate events so one switch counts once', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    dispatchVisibility('hidden');

    await screen.findByText('Tab Switch Detected');
    expect(useStore.getState().tabViolations).toBe(1);
    expect(mocks.addDoc).toHaveBeenCalledTimes(1);
  });

  it('increments the warning count for each separate switch', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');
    await screen.findByText('Tab Switch Detected');
    fireEvent.click(screen.getByRole('button', { name: 'Return to Quiz' }));
    await waitFor(() => expect(screen.queryByText('Tab Switch Detected')).toBeNull());

    await new Promise((r) => setTimeout(r, 550));
    dispatchVisibility('hidden');

    await waitFor(() => expect(useStore.getState().tabViolations).toBe(2));
    expect(mocks.addDoc).toHaveBeenCalledTimes(2);
    await screen.findByText((content) => content.includes('Final warning'));
    await screen.findByText((content) => content.includes('automatically close and be submitted'));
  });

  it('warns on the 2nd attempt and auto-submits on the 3rd', async () => {
    await renderQuizAndWait();

    dispatchVisibility('hidden');
    await screen.findByText('Tab Switch Detected');
    fireEvent.click(screen.getByRole('button', { name: 'Return to Quiz' }));
    await waitFor(() => expect(screen.queryByText('Tab Switch Detected')).toBeNull());

    await new Promise((r) => setTimeout(r, 550));
    dispatchVisibility('hidden');
    await screen.findByText((content) => content.includes('Final warning'));
    expect(screen.getByRole('button', { name: 'Return to Quiz' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Return to Quiz' }));
    await waitFor(() => expect(screen.queryByText('Tab Switch Detected')).toBeNull());

    await new Promise((r) => setTimeout(r, 550));
    dispatchVisibility('hidden');
    await screen.findByText((content) => content.includes('being automatically submitted'));
    expect(screen.queryByRole('button', { name: 'Return to Quiz' })).toBeNull();
    expect(screen.getByText(/Auto-submitting your quiz/)).toBeTruthy();

    await screen.findByText('Results Page', {}, { timeout: 5000 });
    expect(useStore.getState().quizFinished).toBe(true);
    expect(useStore.getState().tabViolations).toBe(3);
  }, 15000);
});

describe('Navigation bar clicks during a quiz', () => {
  it('shows the black blocked page and records a navigation violation', async () => {
    useStore.setState({ quizStartTime: Date.now(), quizFinished: false, quizTime: 300 });

    render(
      <MemoryRouter>
        <QuizCooldown />
      </MemoryRouter>
    );

    await screen.findByText('Navigation Blocked');
    await waitFor(() => expect(useStore.getState().tabViolations).toBe(1));
    expect(mocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'navigation_attempt', violationCount: 1 })
    );
    expect(document.querySelector('.bg-black')).toBeTruthy();
  });

  it('keeps monitoring tab switches on the blocked page', async () => {
    useStore.setState({ quizStartTime: Date.now(), quizFinished: false, quizTime: 300 });

    render(
      <MemoryRouter>
        <QuizCooldown />
      </MemoryRouter>
    );
    await screen.findByText('Navigation Blocked');
    await waitFor(() => expect(useStore.getState().tabViolations).toBe(1));

    await new Promise((r) => setTimeout(r, 550));
    dispatchVisibility('hidden');

    await waitFor(() => expect(useStore.getState().tabViolations).toBe(2));
  });

  it('shows the final warning after the 2nd violation on the blocked page', async () => {
    useStore.setState({ quizStartTime: Date.now(), quizFinished: false, quizTime: 300, tabViolations: 1 });

    render(
      <MemoryRouter>
        <QuizCooldown />
      </MemoryRouter>
    );

    await screen.findByText(/Final warning: one more violation will automatically close and submit your quiz/);
    expect(useStore.getState().tabViolations).toBe(2);
  });

  it('auto-submits from the blocked page on the 3rd violation', async () => {
    useStore.setState({ quizStartTime: Date.now(), quizFinished: false, quizTime: 300, tabViolations: 2, quizViolationLimit: 0 });

    render(
      <MemoryRouter initialEntries={['/quiz-cooldown']}>
        <Routes>
          <Route path="/quiz-cooldown" element={<QuizCooldown />} />
          <Route path="/results" element={<div>Results Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText(/Auto-submitting your quiz/);
    expect(useStore.getState().tabViolations).toBe(3);
    expect(screen.queryByRole('button', { name: 'Return to Quiz' })).toBeNull();

    await screen.findByText('Results Page', {}, { timeout: 5000 });
    expect(useStore.getState().quizFinished).toBe(true);
  }, 15000);
});

describe('Admin real-time violation alerts', () => {
  function fakeSnapshot(docs: { id: string; data: Record<string, unknown> }[]) {
    return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
  }

  it('shows a live alert banner when a student switches tabs', async () => {
    useStore.setState({
      user: { uid: 'admin1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => expect(mocks.onSnapshotCb).not.toBeNull());

    act(() => {
      mocks.onSnapshotCb!(
        fakeSnapshot([
          {
            id: 'v1',
            data: {
              userId: 'u1',
              userName: 'Student One',
              categoryId: 'cat1',
              categoryName: 'Math',
              type: 'tab_switch',
              violationCount: 2,
              createdAt: Date.now(),
            },
          },
        ])
      );
    });

    const banner = await screen.findByText(/Anti-Cheat Alert/);
    expect(banner.textContent).toContain('1 new tab switch violation');
    expect(screen.getByText('Student One')).toBeTruthy();
    expect(screen.getByText('Math')).toBeTruthy();
  });

  it('hides the banner on dismiss and re-alerts for new violations', async () => {
    useStore.setState({
      user: { uid: 'admin1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );
    await waitFor(() => expect(mocks.onSnapshotCb).not.toBeNull());

    act(() => {
      mocks.onSnapshotCb!(
        fakeSnapshot([
          {
            id: 'v1',
            data: { userId: 'u1', userName: 'Student One', type: 'tab_switch', violationCount: 1, createdAt: Date.now() },
          },
        ])
      );
    });
    await screen.findByText(/Anti-Cheat Alert/);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText(/Anti-Cheat Alert/)).toBeNull());

    act(() => {
      mocks.onSnapshotCb!(
        fakeSnapshot([
          {
            id: 'v2',
            data: { userId: 'u1', userName: 'Student One', type: 'tab_switch', violationCount: 2, createdAt: Date.now() },
          },
          {
            id: 'v1',
            data: { userId: 'u1', userName: 'Student One', type: 'tab_switch', violationCount: 1, createdAt: Date.now() - 1000 },
          },
        ])
      );
    });

    await screen.findByText(/Anti-Cheat Alert/);
    expect(screen.getByText('Student One')).toBeTruthy();
  });
});
