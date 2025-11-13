import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TourProvider, useTour, TourAlertDialog } from '../tour';
import { useEffect } from 'react';

// Test component that uses the tour
function TestTourComponent({ steps }) {
  const { setSteps, startTour, nextStep, previousStep, currentStep } = useTour();

  useEffect(() => {
    if (steps) {
      setSteps(steps);
    }
  }, [steps, setSteps]);

  return (
    <div>
      <div data-testid="current-step">{currentStep}</div>
      <button onClick={startTour}>Start Tour</button>
      <button onClick={nextStep}>Next</button>
      <button onClick={previousStep}>Previous</button>
      <div id="step-1">Step 1 Element</div>
      <div id="step-2">Step 2 Element</div>
    </div>
  );
}

describe('TourProvider', () => {
  const mockSteps = [
    {
      selectorId: 'step-1',
      position: 'bottom',
      content: <div>Step 1 Content</div>,
    },
    {
      selectorId: 'step-2',
      position: 'right',
      content: <div>Step 2 Content</div>,
    },
  ];

  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      width: 200,
      height: 50,
      bottom: 150,
      right: 300,
    }));
  });

  it('should render children', () => {
    render(
      <TourProvider>
        <div data-testid="child">Child Content</div>
      </TourProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should start tour when startTour is called', async () => {
    render(
      <TourProvider>
        <TestTourComponent steps={mockSteps} />
      </TourProvider>
    );

    const startButton = screen.getByText('Start Tour');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });
  });

  it('should advance to next step', async () => {
    render(
      <TourProvider>
        <TestTourComponent steps={mockSteps} />
      </TourProvider>
    );

    const startButton = screen.getByRole('button', { name: 'Start Tour' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });

    // Get all Next buttons and click the last one (the one from TestTourComponent)
    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    fireEvent.click(nextButtons[nextButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('1');
    });
  });

  it('should go to previous step', async () => {
    render(
      <TourProvider>
        <TestTourComponent steps={mockSteps} />
      </TourProvider>
    );

    const startButton = screen.getByRole('button', { name: 'Start Tour' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });

    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    fireEvent.click(nextButtons[nextButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('1');
    });

    const previousButtons = screen.getAllByRole('button', { name: 'Previous' });
    fireEvent.click(previousButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });
  });

  it('should call onComplete when finishing tour', async () => {
    const onComplete = vi.fn();

    render(
      <TourProvider onComplete={onComplete}>
        <TestTourComponent steps={mockSteps} />
      </TourProvider>
    );

    const startButton = screen.getByRole('button', { name: 'Start Tour' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });

    // Navigate to last step
    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    fireEvent.click(nextButtons[nextButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('1');
    });

    // Complete tour - click the test component's Next button
    const finalNextButtons = screen.getAllByRole('button', { name: /Next|Finish/ });
    fireEvent.click(finalNextButtons[finalNextButtons.length - 1]);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should not start tour if already completed', () => {
    render(
      <TourProvider isTourCompleted={true}>
        <TestTourComponent steps={mockSteps} />
      </TourProvider>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    // Should remain at -1 (not started)
    expect(screen.getByTestId('current-step')).toHaveTextContent('-1');
  });
});

describe('TourAlertDialog', () => {
  it('should not render if tour is completed', () => {
    const setIsOpen = vi.fn();

    render(
      <TourProvider isTourCompleted={true}>
        <div id="test">Test</div>
        <TourAlertDialog isOpen={true} setIsOpen={setIsOpen} />
      </TourProvider>
    );

    expect(screen.queryByText('Welcome to the Tour')).not.toBeInTheDocument();
  });

  it('should not render if no steps are set', () => {
    const setIsOpen = vi.fn();

    render(
      <TourProvider>
        <div id="test">Test</div>
        <TourAlertDialog isOpen={true} setIsOpen={setIsOpen} />
      </TourProvider>
    );

    expect(screen.queryByText('Welcome to the Tour')).not.toBeInTheDocument();
  });
});

describe('useTour hook', () => {
  it('should throw error when used outside TourProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    function TestComponent() {
      useTour();
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).toThrow(
      'useTour must be used within a TourProvider'
    );

    console.error = originalError;
  });
});
