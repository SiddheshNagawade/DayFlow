import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean; error: Error | null; info: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('React Error Boundary caught:', error, info);
    this.setState({ info: info?.componentStack || '' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:'2rem',fontFamily:'monospace',background:'#1a1a2e',color:'#ff6b6b',minHeight:'100vh'}}>
          <h1 style={{color:'#ff6b6b',fontSize:'1.5rem',marginBottom:'1rem'}}>⚠️ DayFlow Runtime Error</h1>
          <p style={{color:'#ffd700',marginBottom:'0.5rem'}}><strong>Error:</strong> {this.state.error?.message}</p>
          <pre style={{background:'#0d0d1a',padding:'1rem',borderRadius:'8px',overflow:'auto',fontSize:'0.8rem',color:'#ff9999',marginBottom:'1rem'}}>
            {this.state.error?.stack}
          </pre>
          {this.state.info && (
            <>
              <p style={{color:'#ffd700',marginBottom:'0.5rem'}}><strong>Component Stack:</strong></p>
              <pre style={{background:'#0d0d1a',padding:'1rem',borderRadius:'8px',overflow:'auto',fontSize:'0.75rem',color:'#aaa'}}>
                {this.state.info}
              </pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
