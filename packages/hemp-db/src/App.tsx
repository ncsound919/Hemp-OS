/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarRail } from './components/SidebarRail';
import { KnowledgeList } from './components/KnowledgeList';
import { MainContent } from './components/MainContent';
import { StatusBar } from './components/StatusBar';

// Types exactly matching your server's API responses
interface KnowledgeItem {
  id: number;
  name: string;
  type: 'strain' | 'study';
  subtitle: string;
  createdAt: string;
}

interface StrainDetail {
  id: number;
  name: string;
  type: string | null;
  thcMin: number | null;
  thcMax: number | null;
  cbdMin: number | null;
  cbdMax: number | null;
  terpeneProfile: string | null;
  effects: string | null;
  medicalUses: string | null;
  source: string | null;
  createdAt: string | null;
}

interface StudyDetail {
  id: number;
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  fullTextPath: string | null;
  topicTags: string | null;
  population: string | null;
  dose: string | null;
  route: string | null;
  outcomes: string | null;
  createdAt: string | null;
}

export default function App() {
  // Core state
  const [selectedEntity, setSelectedEntity] = useState<KnowledgeItem | null>(null);
  const [recentEntities, setRecentEntities] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Detail state
  const [strainDetail, setStrainDetail] = useState<StrainDetail | null>(null);
  const [studyDetail, setStudyDetail] = useState<StudyDetail | null>(null);
  const [relatedStudies, setRelatedStudies] = useState<any[]>([]);
  
  // UI state
  const [activeView, setActiveView] = useState<'strain' | 'study' | 'system' | 'insights'>('strain');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Stable callback: load strain details
  const loadStrainDetail = useCallback(async (strainId: number) => {
    try {
      setStatusMessage(`Loading strain #${strainId}...`);
      const response = await fetch(`/api/strains/${strainId}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Strain not found');
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setStrainDetail(data.strain);
      setRelatedStudies(data.relatedStudies || []);
      setStatusMessage(`Loaded: ${data.strain.name}`);
    } catch (err) {
      console.error('Failed to load strain details:', err);
      setStrainDetail(null);
      setRelatedStudies([]);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Failed to load strain'}`);
    }
  }, []);

  // Stable callback: load study details
  const loadStudyDetail = useCallback(async (studyId: number) => {
    try {
      setStatusMessage(`Loading study #${studyId}...`);
      const response = await fetch(`/api/studies/${studyId}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Study not found');
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setStudyDetail(data.study);
      setStatusMessage(`Loaded: ${data.study.title}`);
    } catch (err) {
      console.error('Failed to load study details:', err);
      setStudyDetail(null);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Failed to load study'}`);
    }
  }, []);

  // Stable callback: handle entity selection
  const handleEntitySelect = useCallback((entity: KnowledgeItem) => {
    setSelectedEntity(entity);
    setActiveView(entity.type);
    
    // Clear previous details
    setStrainDetail(null);
    setStudyDetail(null);
    setRelatedStudies([]);
    
    // Load appropriate details
    if (entity.type === 'strain') {
      loadStrainDetail(entity.id);
    } else {
      loadStudyDetail(entity.id);
    }
  }, [loadStrainDetail, loadStudyDetail]);

  // Stable callback: search entities with simple and advanced filters
  const searchEntities = useCallback(async (text: string, terpeneId: string, effectId: string, minConc: number) => {
    try {
      setIsLoading(true);
      setError(null);
      setStatusMessage('Querying local database...');

      if (terpeneId || effectId) {
        let url = `/api/strains/advanced-search?`;
        if (terpeneId) url += `terpeneId=${encodeURIComponent(terpeneId)}&`;
        if (effectId) url += `effectId=${encodeURIComponent(effectId)}&`;
        if (minConc > 0) url += `minConcentration=${minConc}&`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const strainsList = data.strains || [];
        // Map to KnowledgeItem shape
        const items: KnowledgeItem[] = strainsList.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: 'strain',
          subtitle: `${s.type || 'Unknown'} • THC ${s.thcMin ? (s.thcMin / 100).toFixed(1) : '?'}-${s.thcMax ? (s.thcMax / 100).toFixed(1) : '?'}%`,
          createdAt: s.createdAt || new Date().toISOString(),
        }));

        // Filter by text locally if text search is also specified
        let finalItems = items;
        if (text) {
          const t = text.toLowerCase();
          finalItems = items.filter(item => 
            item.name.toLowerCase().includes(t) || item.subtitle.toLowerCase().includes(t)
          );
        }

        setRecentEntities(finalItems);
        setStatusMessage(`Found ${finalItems.length} matching strains`);
      } else {
        // Standard text-only search
        const url = `/api/recent-entities?q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setRecentEntities(data.entities || []);
        setStatusMessage(`Found ${data.entities?.length || 0} matching records`);
      }
    } catch (err) {
      console.error('Failed to search entities:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setStatusMessage('Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stable callback: load recent entities
  const loadRecentEntities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStatusMessage('Loading entities...');
      
      const response = await fetch('/api/recent-entities');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const entities = data.entities || [];
      setRecentEntities(entities);
      
      // Do not auto-select, allow user to see the Rolodex first
      
      setStatusMessage(`Loaded ${entities.length} entities`);
      setDbStatus('connected');
    } catch (err) {
      console.error('Failed to load entities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setStatusMessage('Connection error - check server');
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntity, handleEntitySelect]);

  // Initial load
  useEffect(() => {
    // Health check
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setDbStatus(data.database === 'connected' ? 'connected' : 'error'))
      .catch(() => setDbStatus('error'));
    
    loadRecentEntities();

    const handleSelectEntity = (e: any) => {
      handleEntitySelect(e.detail as KnowledgeItem);
    };
    const handleClearSelection = () => {
      setSelectedEntity(null);
      setStrainDetail(null);
      setStudyDetail(null);
    };
    window.addEventListener('selectEntity', handleSelectEntity);
    window.addEventListener('clearSelection', handleClearSelection);
    return () => {
      window.removeEventListener('selectEntity', handleSelectEntity);
      window.removeEventListener('clearSelection', handleClearSelection);
    };
  }, [handleEntitySelect]); // Run once on mount

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0A0B0C] text-[#E0E2E5] font-sans">
      <Header 
        activeEntity={selectedEntity}
        onViewChange={setActiveView}
        activeView={activeView}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <SidebarRail 
          activeView={activeView}
          onViewChange={setActiveView}
          entityCount={recentEntities.length}
        />
        
        <KnowledgeList 
          items={recentEntities}
          selectedId={selectedEntity?.id}
          onSelect={handleEntitySelect}
          isLoading={isLoading}
          error={error}
          onRefresh={loadRecentEntities}
          onSearch={searchEntities}
        />
        
        <MainContent 
          selectedEntity={selectedEntity}
          strainDetail={strainDetail}
          studyDetail={studyDetail}
          relatedStudies={relatedStudies}
          activeView={activeView}
          isLoading={isLoading}
        />
      </div>
      
      <StatusBar 
        message={statusMessage}
        entityCount={recentEntities.length}
        dbType={dbStatus === 'connected' ? 'PostgreSQL' : 'PostgreSQL ⚠'}
      />
    </div>
  );
}
