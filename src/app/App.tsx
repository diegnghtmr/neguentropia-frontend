import { useState } from 'react';
import { Ranking } from '../features/ranking';
import { Similarity } from '../features/similarity';
import { Corpus } from '../features/corpus';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';

export default function App() {
  const [view, setView] = useState('corpus');
  return (
    <div className="workspace">
      <header className="workspace-header">
        <img src="/favicon.svg" alt="" width="48" height="48" className="workspace-mark" />
        <div className="workspace-brand">
          <h1>Neguentropía</h1>
          <p>Text analysis workspace</p>
        </div>
      </header>

      <main aria-label="Workspace" className="workspace-main">
        <Tabs value={view} onValueChange={setView}>
          <TabsList aria-label="Workspace views">
            <TabsTrigger value="corpus">Corpus</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="similarity">Similarity</TabsTrigger>
          </TabsList>
          <TabsContent value="corpus" forceMount hidden={view !== 'corpus'}>
            <Corpus />
          </TabsContent>
          <TabsContent value="ranking" forceMount hidden={view !== 'ranking'}>
            {view === 'ranking' && <Ranking />}
          </TabsContent>
          <TabsContent value="similarity" forceMount hidden={view !== 'similarity'}>
            {view === 'similarity' && <Similarity />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
