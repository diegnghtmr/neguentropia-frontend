import { useRef, useState } from 'react';
import { Ranking } from '../features/ranking';
import { Corpus } from '../features/corpus';
import cojeevLicense from '../../licenses/cojeev/LICENCE?url&no-inline';
import dmSansLicense from '../styles/fonts/DMSans-OFL.txt?url&no-inline';
import bricolageLicense from '../styles/fonts/BricolageGrotesque-OFL.txt?url&no-inline';

export default function App() {
  const [view, setView] = useState<'corpus' | 'ranking'>('corpus');
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div className="workspace">
      <header className="workspace-header">
        <span aria-hidden="true" className="workspace-mark">N</span>
        <div className="workspace-brand">
          <h1>Neguentropía</h1>
          <p>Text analysis workspace</p>
        </div>
        <p className="workspace-notice">Read the corpus or run a ranking.</p>
      </header>

      <main aria-label="Workspace" className="workspace-main">
        <div role="tablist" aria-label="Workspace views" className="workspace-tabs">
          {(['corpus', 'ranking'] as const).map((name, index) => <button
            key={name} ref={(element) => { tabs.current[index] = element; }}
            type="button" role="tab" id={`${name}-tab`} aria-selected={view === name}
            aria-controls={`${name}-panel`} tabIndex={view === name ? 0 : -1}
            onClick={() => setView(name)}
            onKeyDown={(event) => {
              let target: number;
              if (event.key === 'Home') target = 0;
              else if (event.key === 'End') target = 1;
              else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') target = 1 - index;
              else return;
              event.preventDefault();
              setView(target === 0 ? 'corpus' : 'ranking');
              tabs.current[target]?.focus();
            }}
          >{name === 'corpus' ? 'Corpus' : 'Ranking'}</button>)}
        </div>
        <div role="tabpanel" id="corpus-panel" aria-labelledby="corpus-tab" hidden={view !== 'corpus'} tabIndex={0}>
          <Corpus />
        </div>
        <div role="tabpanel" id="ranking-panel" aria-labelledby="ranking-tab" hidden={view !== 'ranking'} tabIndex={0}>
          {view === 'ranking' && <Ranking />}
        </div>
      </main>

      <footer className="workspace-footer">
        <p>Local development foundation</p>
        <nav aria-label="Third-party licenses">
          <a href={cojeevLicense}>Cojeev UI license</a>
          <a href={dmSansLicense}>DM Sans license</a>
          <a href={bricolageLicense}>Bricolage Grotesque license</a>
        </nav>
      </footer>
    </div>
  );
}
