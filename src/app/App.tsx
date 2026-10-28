import { useState } from 'react';
import { Ranking } from '../features/ranking';
import { Similarity } from '../features/similarity';
import { Clustering } from '../features/clustering';
import { Search } from '../features/search';
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
          <p>Espacio de análisis de textos</p>
        </div>
      </header>

      <main aria-label="Espacio de trabajo" className="workspace-main">
        <Tabs value={view} onValueChange={setView}>
          <TabsList aria-label="Vistas del espacio de trabajo">
            <TabsTrigger value="corpus">Corpus</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="similarity">Similitud</TabsTrigger>
            <TabsTrigger value="clustering">Agrupamiento</TabsTrigger>
            <TabsTrigger value="search">Búsqueda</TabsTrigger>
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
          <TabsContent value="clustering" forceMount hidden={view !== 'clustering'}>
            {view === 'clustering' && <Clustering />}
          </TabsContent>
          <TabsContent value="search" forceMount hidden={view !== 'search'}>
            {view === 'search' && <Search />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
