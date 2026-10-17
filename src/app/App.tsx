import { Corpus } from '../features/corpus';
import cojeevLicense from '../../licenses/cojeev/LICENCE?url&no-inline';
import dmSansLicense from '../styles/fonts/DMSans-OFL.txt?url&no-inline';
import bricolageLicense from '../styles/fonts/BricolageGrotesque-OFL.txt?url&no-inline';

export default function App() {
  return (
    <div className="workspace">
      <header className="workspace-header">
        <span aria-hidden="true" className="workspace-mark">N</span>
        <div className="workspace-brand">
          <h1>Neguentropía</h1>
          <p>Text analysis workspace</p>
        </div>
        <p className="workspace-notice">No analysis has been run.</p>
      </header>

      <main aria-label="Workspace" className="workspace-main">
        <Corpus />
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
